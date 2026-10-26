import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import crypto from "crypto";
import config from "../config";
import { AiCopilotService, ProcessCopilotMessageInput } from "../services/ai-copilot.service";
import { VehicleTelemetry } from "../models/ai-copilot-session.model";

// In-memory sliding window rate limiter per socket: socket.id -> array of timestamps
const socketMessageTimestamps = new Map<string, number[]>();
const MAX_MESSAGES_PER_MINUTE = 40;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export function initializeCopilotSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingInterval: 60000, // 1 minute WebSocket keep-alive ping interval
    pingTimeout: 20000,
  });

  // Handshake Authentication Guard
  io.use((socket: Socket, next) => {
    if (!config.apiKey) {
      return next();
    }

    const clientToken =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.headers["x-api-key"] as string) ||
      (socket.handshake.query?.token as string);

    if (!clientToken) {
      return next(new Error("Unauthorized: Missing authentication token in WebSocket handshake."));
    }

    const expectedBuffer = Buffer.from(config.apiKey);
    const providedBuffer = Buffer.from(clientToken);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return next(new Error("Unauthorized: Invalid WebSocket authentication token."));
    }

    next();
  });

  console.log("[B Map AI] Initialized Socket.IO copilot gateway with security guard");

  io.on("connection", (socket: Socket) => {
    console.log(`[Copilot-Socket] Driver client connected: ${socket.id}`);
    socketMessageTimestamps.set(socket.id, []);

    /**
     * Inbound Event: copilot_message_stream
     * Ingests driver speech/prompt and live vehicle telemetry
     */
    socket.on(
      "copilot_message_stream",
      async (payload: {
        sessionId?: string;
        driverId?: string;
        prompt: string;
        telemetry: VehicleTelemetry;
      }) => {
        try {
          // 1. Sliding window rate limiting
          const now = Date.now();
          const timestamps = (socketMessageTimestamps.get(socket.id) || []).filter(
            (t) => now - t < RATE_LIMIT_WINDOW_MS
          );

          if (timestamps.length >= MAX_MESSAGES_PER_MINUTE) {
            socket.emit("copilot_error", {
              error: "Rate limit exceeded. Please slow down your voice/message requests.",
            });
            return;
          }

          timestamps.push(now);
          socketMessageTimestamps.set(socket.id, timestamps);

          // 2. Validate payload
          const { sessionId, driverId, prompt, telemetry } = payload;
          if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            socket.emit("copilot_error", { error: "Prompt is required in stream payload" });
            return;
          }

          // Bound prompt length to prevent memory abuse
          const sanitizedPrompt = prompt.trim().slice(0, 2000);

          const effectiveSessionId =
            sessionId && typeof sessionId === "string" && sessionId.trim()
              ? sessionId.trim().slice(0, 128)
              : `stream_sess_${socket.id}`;

          const input: ProcessCopilotMessageInput = {
            sessionId: effectiveSessionId,
            driverId: driverId ? String(driverId).slice(0, 128) : socket.id,
            prompt: sanitizedPrompt,
            telemetry: telemetry || {
              coordinates: [77.2177, 28.6304],
              speedKmH: 50,
              headingDeg: 120,
              remainingDistanceMeters: 8500,
              etaMinutes: 12,
              batteryOrFuelSoC: 80,
              activeRouteId: "route_stream_live",
              destinationMetadata: {
                name: "Connaught Place, New Delhi",
                coordinates: [77.2177, 28.6304],
              },
            },
          };

          socket.emit("copilot_processing_status", {
            status: "analyzing_telemetry_and_intent",
            timestamp: new Date().toISOString(),
          });

          const response = await AiCopilotService.processMessage(input);

          /**
           * Outbound Event: copilot_message_response
           * Emits structured assistant reply, executed tools, UI suggestions, and action payloads
           */
          socket.emit("copilot_message_response", response);
        } catch (err: any) {
          console.error("[Copilot-Socket] Error processing message stream:", err);
          socket.emit("copilot_error", {
            error: "Failed to process copilot message stream",
          });
        }
      }
    );

    socket.on("disconnect", () => {
      socketMessageTimestamps.delete(socket.id);
      console.log(`[Copilot-Socket] Driver client disconnected: ${socket.id}`);
    });
  });

  return io;
}
