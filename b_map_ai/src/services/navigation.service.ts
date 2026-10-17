import { LlmService } from "./llm.service";
import {
  NavigationRequest,
  PoiSearchRequest,
  RerouteRequest,
  TrafficAdvisoryRequest,
  ChatRequest,
  LlmResponse,
} from "../types";

export class NavigationService {
  /**
   * Generates comprehensive route navigation guidance, landmarks, and safety notes.
   */
  public static async planRoute(req: NavigationRequest): Promise<LlmResponse> {
    return await LlmService.navigation({
      origin: req.origin,
      destination: req.destination,
      travel_mode: req.travel_mode || "driving",
      preferences: req.preferences || "fastest route",
      additional_context: req.additional_context || "",
      max_tokens: req.max_tokens || 350,
    });
  }

  /**
   * Recommends Points of Interest (POIs) such as fuel, EV charging, food, rest stops, or parking.
   */
  public static async recommendPOIs(req: PoiSearchRequest): Promise<LlmResponse> {
    const category = req.category || "fuel, food, and rest stops";
    const prompt = (
      `As B Map AI navigation assistant, identify and recommend top ${category} near ${req.location}.\n` +
      (req.radius_meters ? `Within an approximate radius of ${req.radius_meters} meters.\n` : "") +
      (req.preferences ? `User preferences: ${req.preferences}\n` : "") +
      `Provide:\n` +
      `1. Recommended Stops & Venues\n` +
      `2. Distance / Proximity relative to route\n` +
      `3. Convenience, parking, or access notes\n` +
      `4. Quick navigation direction to reach them`
    );

    return await LlmService.chat({
      prompt,
      max_tokens: 300,
    });
  }

  /**
   * Generates dynamic rerouting instructions when a user misses an exit or takes a wrong turn.
   */
  public static async getRerouteAdvice(req: RerouteRequest): Promise<LlmResponse> {
    const prompt = (
      `REROUTE ALERT for B Map AI:\n` +
      `- User's current position: ${req.current_location}\n` +
      `- Final destination: ${req.destination}\n` +
      `- Deviation reason: ${req.deviation_reason || "Missed expected turn / off course"}\n` +
      (req.previous_route_summary ? `- Previous route: ${req.previous_route_summary}\n` : "") +
      `\nPlease provide:\n` +
      `1. Immediate course-correction advice (e.g. U-turn, next intersection turnaround, or alternate connector road)\n` +
      `2. New estimated path back towards destination\n` +
      `3. Driver reassurance and caution notes`
    );

    return await LlmService.chat({
      prompt,
      max_tokens: 250,
    });
  }

  /**
   * Generates traffic and environmental travel advisory.
   */
  public static async getTrafficAdvisory(req: TrafficAdvisoryRequest): Promise<LlmResponse> {
    const prompt = (
      `B Map AI Traffic & Corridor Advisory:\n` +
      `- Route / Area: ${req.route_or_area}\n` +
      (req.reported_issues ? `- Reported Issues: ${req.reported_issues}\n` : "") +
      (req.weather_conditions ? `- Weather / Conditions: ${req.weather_conditions}\n` : "") +
      `\nPlease provide:\n` +
      `1. Traffic impact summary & expected delay assessment\n` +
      `2. Recommended detour or lane advice\n` +
      `3. Weather/safety driving precautions`
    );

    return await LlmService.chat({
      prompt,
      max_tokens: 250,
    });
  }

  /**
   * Natural language chat with B Map AI for navigation guidance.
   */
  public static async chat(req: ChatRequest): Promise<LlmResponse> {
    return await LlmService.chat(req);
  }
}
