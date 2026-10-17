import { Request, Response } from "express";
import { NavigationService } from "../services/navigation.service";
import { LlmService } from "../services/llm.service";
import {
  NavigationRequest,
  PoiSearchRequest,
  RerouteRequest,
  TrafficAdvisoryRequest,
  ChatRequest,
} from "../types";

export class NavigationController {
  /**
   * Plan navigation route
   * POST /api/navigation/route-plan
   */
  public static async planRoute(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, travel_mode, preferences, additional_context, max_tokens } =
        req.body as NavigationRequest;

      if (!origin || !destination) {
        res.status(400).json({
          success: false,
          error: "Both 'origin' and 'destination' fields are required.",
        });
        return;
      }

      const result = await NavigationService.planRoute({
        origin,
        destination,
        travel_mode,
        preferences,
        additional_context,
        max_tokens,
      });

      res.json({
        success: true,
        data: result,
        query: { origin, destination, travel_mode: travel_mode || "driving" },
      });
    } catch (err: any) {
      console.error("[NavigationController.planRoute]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Internal navigation planning error",
      });
    }
  }

  /**
   * Point of Interest recommendation
   * POST /api/navigation/poi-search
   */
  public static async searchPOI(req: Request, res: Response): Promise<void> {
    try {
      const { location, category, radius_meters, preferences } = req.body as PoiSearchRequest;

      if (!location) {
        res.status(400).json({
          success: false,
          error: "'location' field is required for POI search.",
        });
        return;
      }

      const result = await NavigationService.recommendPOIs({
        location,
        category,
        radius_meters,
        preferences,
      });

      res.json({
        success: true,
        data: result,
        query: { location, category: category || "general" },
      });
    } catch (err: any) {
      console.error("[NavigationController.searchPOI]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve POI recommendations",
      });
    }
  }

  /**
   * Dynamic reroute guidance
   * POST /api/navigation/reroute
   */
  public static async reroute(req: Request, res: Response): Promise<void> {
    try {
      const { current_location, destination, deviation_reason, previous_route_summary } =
        req.body as RerouteRequest;

      if (!current_location || !destination) {
        res.status(400).json({
          success: false,
          error: "Both 'current_location' and 'destination' are required for rerouting.",
        });
        return;
      }

      const result = await NavigationService.getRerouteAdvice({
        current_location,
        destination,
        deviation_reason,
        previous_route_summary,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("[NavigationController.reroute]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to compute reroute advice",
      });
    }
  }

  /**
   * Traffic & corridor advisory
   * POST /api/navigation/traffic-advisory
   */
  public static async trafficAdvisory(req: Request, res: Response): Promise<void> {
    try {
      const { route_or_area, reported_issues, weather_conditions } =
        req.body as TrafficAdvisoryRequest;

      if (!route_or_area) {
        res.status(400).json({
          success: false,
          error: "'route_or_area' is required for traffic advisory.",
        });
        return;
      }

      const result = await NavigationService.getTrafficAdvisory({
        route_or_area,
        reported_issues,
        weather_conditions,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("[NavigationController.trafficAdvisory]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve traffic advisory",
      });
    }
  }

  /**
   * Natural conversational chat with B Map AI
   * POST /api/chat
   */
  public static async chat(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, system_prompt, history, max_tokens } = req.body as ChatRequest;

      if (!prompt) {
        res.status(400).json({
          success: false,
          error: "'prompt' field is required.",
        });
        return;
      }

      const result = await NavigationService.chat({
        prompt,
        system_prompt,
        history,
        max_tokens,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("[NavigationController.chat]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Inference error during chat",
      });
    }
  }

  /**
   * Check Gemma model server health
   * GET /api/model/status
   */
  public static async getModelStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await LlmService.getHealth();
      res.json({
        success: true,
        health,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Manually trigger model server startup
   * POST /api/model/start
   */
  public static async startModel(req: Request, res: Response): Promise<void> {
    try {
      const status = await LlmService.startServer();
      res.json({
        success: true,
        result: status,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
}
