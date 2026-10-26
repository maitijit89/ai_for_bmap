import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";
import DatabaseManager from "./config/database";
import { navigationRoutes, copilotRoutes, appVersionRoutes } from "./routes";
import { LlmService, KeepAliveService } from "./services";
import { initializeCopilotSocket } from "./sockets";
import { AntiTamperSentinel } from "./security/anti-tamper";
import {
  requestLogger,
  notFoundHandler,
  errorHandler,
  securityHeaders,
  globalRateLimiter,
  antiReconTrap,
  noSqlSanitizer,
} from "./middlewares";

// Initialize Runtime Anti-Tamper Defense Sentinel immediately
AntiTamperSentinel.init();

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO Gateway for In-Drive Realtime Streaming
const io = initializeCopilotSocket(httpServer);

// Anti-Reconnaissance & Scanner Trap (Rule 2.4 - Must execute first)
app.use(antiReconTrap);

// Production Security & Rate Limiting Middleware
app.use(securityHeaders);
app.use(globalRateLimiter);

// Global Middleware
app.use(
  cors({
    origin: config.corsOrigins.includes("*") ? "*" : config.corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-API-KEY"],
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(noSqlSanitizer);
app.use(requestLogger);

// Root Information & Status Route
app.get("/", async (_req: Request, res: Response) => {
  const modelHealth = await LlmService.getHealth();
  const dbHealth = DatabaseManager.getHealth();
  const antiTamper = AntiTamperSentinel.getStatus();

  res.json({
    platform: "B Map AI Navigation Platform",
    version: "2.1.0",
    security_patch_level: "2026-10-26-P1",
    anti_tamper_defense: antiTamper,

    description: "Enterprise-Grade In-Drive Copilot, Multimodal Vision, and Geospatial Intelligence",
    status: "online",
    database: dbHealth,
    model_status: modelHealth,
    uptime_seconds: Math.floor(process.uptime()),
    modules: {
      "1_copilot": {
        name: "In-Drive Conversational Copilot & Agentic LLM",
        rest_endpoint: "/api/v1/ai-copilot/message",
        websocket_stream: "copilot_message_stream -> copilot_message_response",
        intents_supported: [
          "FIND_ALONG_ROUTE",
          "REROUTE_TRAFFIC_WEATHER",
          "FATIGUE_REST_ASSIST",
          "QUERY_PARKING_LAST_METER",
          "NAV_CONTROL",
          "POI_DETAILS_INQUIRY",
          "GENERAL_TRAVEL_QNA",
          "UNKNOWN",
        ],
        tools: ["add_waypoint", "switch_route", "reserve_parking", "mute", "adjust_hud"],
      },
      "2_vision": {
        name: "Multimodal Computer Vision AI & Road Scene Hazard Analyzer",
        endpoints: {
          analyze: "POST /api/v1/ai-copilot/vision/analyze",
          nearby_incidents: "GET /api/v1/ai-copilot/vision/incidents/nearby",
          parking_occupancy: "GET /api/v1/ai-copilot/vision/parking-occupancy/:facilityId",
        },
      },
      "3_traffic": {
        name: "AI Predictive Traffic & Spatio-Temporal Departure Optimizer",
        endpoints: {
          departure_optimizer: "POST /api/v1/ai-copilot/traffic/departure-optimizer",
        },
      },
      "4_poi": {
        name: "AI POI Intelligence & Destination Arrival Briefing",
        endpoints: {
          intelligence: "GET /api/v1/ai-copilot/poi/intelligence",
          arrival_briefing: "POST /api/v1/ai-copilot/poi/arrival-briefing",
        },
      },
      "5_map_production": {
        name: "Big-Data Trajectory Mining & Map Production AI",
        endpoints: {
          stay_points: "POST /api/v1/ai-copilot/map/stay-points",
          fuse_poi: "POST /api/v1/ai-copilot/map/fuse-poi",
          road_centerline: "POST /api/v1/ai-copilot/map/road-centerline",
          detect_zero_flow: "POST /api/v1/ai-copilot/map/detect-zero-flow",
        },
      },
      "6_sensor_adas": {
        name: "Sensor Machine Learning, Perception & ADAS",
        endpoints: {
          activity: "POST /api/v1/ai-copilot/sensors/activity",
          adas_assess: "POST /api/v1/ai-copilot/adas/assess",
          veteran_insight: "GET /api/v1/ai-copilot/veteran/edge-insight",
          ar_hud: "POST /api/v1/ai-copilot/ar/hud-projection",
        },
      },
      "7_routing_env": {
        name: "Intelligent Route Optimization & Environmental AI",
        endpoints: {
          bpr_weight: "POST /api/v1/ai-copilot/routing/bpr-weight",
          dynamic_recommendations: "POST /api/v1/ai-copilot/routing/dynamic-recommendations",
          eco_route: "POST /api/v1/ai-copilot/routing/eco-route",
          vernacular_voice: "POST /api/v1/ai-copilot/vernacular/voice-prompt",
        },
      },
    },
    documentation: "See README.md for full specs.",
  });
});

// Production Health Probe
app.get("/health", async (_req: Request, res: Response) => {
  const modelHealth = await LlmService.getHealth();
  const dbHealth = DatabaseManager.getHealth();
  const memUsage = process.memoryUsage();

  res.json({
    backend: "healthy",
    version: "2.1.0",
    security_patch_level: "2026-10-26-P1",
    zero_trust_perimeter: "active",
    socket_gateway: "active",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: dbHealth,
    model: modelHealth,
    system: {
      memory_heap_used_mb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,
      memory_rss_mb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,
      node_version: process.version,
    },
  });

});

// Readiness Probe for K8s / Docker container orchestration
app.get("/ready", async (_req: Request, res: Response) => {
  const modelHealth = await LlmService.getHealth();
  const isReady = modelHealth.is_ready || modelHealth.status === "loading";

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    status: isReady ? "ready_for_traffic" : "warming_up",
    model_status: modelHealth.status,
  });
});

// Production Lightweight Keep-Alive Ping Endpoint
app.get("/ping", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "pong",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// Mount Routes
app.use("/api/v1/ai-copilot", copilotRoutes);
app.use("/api/v1/app-version", appVersionRoutes);
app.use("/api/v1", appVersionRoutes);
app.use("/api", navigationRoutes);


// 404 Handler & Global Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

// Start HTTP & WebSocket Server
const server = httpServer.listen(config.port, async () => {
  console.log("======================================================");
  console.log(" [B Map AI] Enterprise Navigation Platform Initialized");
  console.log("======================================================");
  console.log(` Server URL       : http://localhost:${config.port}`);
  console.log(` WebSocket Gateway: ws://localhost:${config.port}`);
  console.log(` Environment      : ${config.nodeEnv}`);
  console.log(` Gemma Model URL  : ${config.gemma.apiUrl}`);
  console.log(` Auto-start Model : ${config.gemma.autoStart}`);
  console.log("======================================================");

  // Connect to Database (with resilient fallback)
  await DatabaseManager.connect();

  try {
    const health = await LlmService.getHealth();
    if (health.is_ready) {
      console.log(`[B Map AI] Gemma 3 1B model is ONLINE and ready!`);
    } else if (health.status === "loading") {
      console.log(`[B Map AI] Gemma 3 1B model is currently loading into memory...`);
    } else {
      console.log(`[B Map AI] Gemma model server is currently ${health.status}.`);
      if (config.gemma.autoStart) {
        console.log(`[B Map AI] Auto-starting Gemma LLM inference server...`);
        const startRes = await LlmService.startServer().catch((e) => {
          console.warn(`[B Map AI] Auto-start attempt error: ${e.message}`);
          return { started: false, message: e.message };
        });
        if (startRes) {
          console.log(`[B Map AI] Gemma startup result: ${startRes.message}`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[B Map AI] Could not query initial model status: ${err.message}`);
  }

  // Auto-run bug test if configured in .env or via CLI flags
  const shouldRunBugTest =
    config.runBugTest ||
    process.env.RUN_BUG_TEST === "true" ||
    process.argv.includes("--run-bug-test") ||
    process.argv.includes("--test");

  if (shouldRunBugTest) {
    console.log("\n[B Map AI] Startup Bug Test triggered. Awaiting Gemma LLM model readiness...");
    await LlmService.waitForReady(45_000);
    try {
      const { runBugTestSuite } = await import("./diagnostics/bug-tester");
      await runBugTestSuite({ exitOnError: false });
    } catch (testErr: any) {
      console.error(`[B Map AI] Startup bug test failed to execute: ${testErr.message}`);
    }
  }

  // Start 1-Minute Keep-Alive Auto-Pinger (keeps free-tier cloud instances awake)
  KeepAliveService.start();
});

// Graceful Shutdown Handlers
process.on("SIGINT", async () => {
  console.log("\n[B Map AI] Shutting down gracefully...");
  KeepAliveService.stop();
  io.close();
  await DatabaseManager.disconnect();
  LlmService.stopServer();
  server.close(() => {
    console.log("[B Map AI] HTTP and WebSocket servers closed.");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\n[B Map AI] Received SIGTERM. Shutting down...");
  KeepAliveService.stop();
  io.close();
  await DatabaseManager.disconnect();
  LlmService.stopServer();
  server.close(() => {
    process.exit(0);
  });
});

export * from "./engines";
export default app;
