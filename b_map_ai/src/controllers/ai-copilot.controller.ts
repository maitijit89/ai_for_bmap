import { Request, Response } from "express";
import { AiCopilotService, ProcessCopilotMessageInput } from "../services/ai-copilot.service";

export class AiCopilotController {
  /**
   * Process in-drive prompt with vehicle telemetry
   * POST /api/v1/ai-copilot/message
   */
  public static async handleMessage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, driverId, prompt, telemetry } = req.body;

      if (!prompt) {
        res.status(400).json({ success: false, error: "'prompt' is required." });
        return;
      }

      const effectiveTelemetry = telemetry || {
        coordinates: [77.2177, 28.6304],
        speedKmH: 60,
        headingDeg: 90,
        remainingDistanceMeters: 12000,
        etaMinutes: 15,
        batteryOrFuelSoC: 75,
        activeRouteId: "route_default",
        destinationMetadata: {
          name: "Connaught Place, New Delhi",
          coordinates: [77.2177, 28.6304],
        },
      };

      const effectiveSessionId =
        sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const input: ProcessCopilotMessageInput = {
        sessionId: effectiveSessionId,
        driverId,
        prompt,
        telemetry: effectiveTelemetry,
      };

      const response = await AiCopilotService.processMessage(input);

      res.json({
        success: true,
        data: response,
      });
    } catch (err: any) {
      console.error("[AiCopilotController.handleMessage]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to process copilot message",
      });
    }
  }

  /**
   * Natural Language Intent Classification only
   * POST /api/v1/ai-copilot/classify-intent
   */
  public static classifyIntent(req: Request, res: Response): void {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ success: false, error: "'prompt' is required." });
        return;
      }

      const result = AiCopilotService.classifyIntent(prompt);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Retrieve active session
   * GET /api/v1/ai-copilot/session/:sessionId
   */
  public static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      if (!sessionId) {
        res.status(400).json({ success: false, error: "sessionId is required." });
        return;
      }
      const session = await AiCopilotService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ success: false, error: "Session not found." });
        return;
      }

      res.json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
