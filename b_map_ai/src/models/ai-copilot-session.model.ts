import mongoose, { Schema, Document } from "mongoose";

export type CopilotIntent =
  | "FIND_ALONG_ROUTE"
  | "REROUTE_TRAFFIC_WEATHER"
  | "FATIGUE_REST_ASSIST"
  | "QUERY_PARKING_LAST_METER"
  | "NAV_CONTROL"
  | "POI_DETAILS_INQUIRY"
  | "GENERAL_TRAVEL_QNA"
  | "UNKNOWN";

export type NavActionType =
  | "add_waypoint"
  | "switch_route"
  | "reserve_parking"
  | "mute"
  | "unmute"
  | "adjust_hud";

export interface VehicleTelemetry {
  coordinates: [number, number]; // [longitude, latitude]
  speedKmH: number;
  headingDeg: number;
  remainingDistanceMeters: number;
  etaMinutes: number;
  batteryOrFuelSoC: number; // 0 - 100%
  activeRouteId: string;
  destinationMetadata: {
    name: string;
    coordinates: [number, number];
    address?: string;
    category?: string;
  };
}

export interface CopilotActionPayload {
  tool: NavActionType;
  params: Record<string, any>;
  description: string;
}

export interface CopilotTurn {
  turnId: string;
  timestamp: string;
  role: "driver" | "copilot";
  prompt?: string;
  response?: string;
  classifiedIntent?: CopilotIntent;
  confidence?: number;
  vehicleTelemetrySnapshot?: VehicleTelemetry;
  executedActions?: CopilotActionPayload[];
  uiSuggestions?: string[];
}

export interface ICopilotSession extends Document {
  sessionId: string;
  driverId?: string;
  activeRouteId: string;
  destinationName: string;
  startedAt: Date;
  lastActiveAt: Date;
  turns: CopilotTurn[];
  latestTelemetry?: VehicleTelemetry;
}

const CopilotSessionSchema = new Schema<ICopilotSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    driverId: { type: String, default: "anonymous_driver" },
    activeRouteId: { type: String, required: true },
    destinationName: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    turns: [
      {
        turnId: String,
        timestamp: String,
        role: String,
        prompt: String,
        response: String,
        classifiedIntent: String,
        confidence: Number,
        vehicleTelemetrySnapshot: Schema.Types.Mixed,
        executedActions: [Schema.Types.Mixed],
        uiSuggestions: [String],
      },
    ],
    latestTelemetry: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Fallback bounded in-memory storage when MongoDB is not connected (Max 500 sessions)
class BoundedMap<K, V> extends Map<K, V> {
  constructor(private maxEntries: number = 500) {
    super();
  }

  override set(key: K, value: V): this {
    if (this.size >= this.maxEntries && !this.has(key)) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    return super.set(key, value);
  }
}

export const inMemorySessions = new BoundedMap<string, any>(500);

let SessionModel: mongoose.Model<ICopilotSession>;
try {
  SessionModel = mongoose.model<ICopilotSession>("CopilotSession", CopilotSessionSchema);
} catch {
  SessionModel = mongoose.model<ICopilotSession>("CopilotSession");
}

export { SessionModel };
