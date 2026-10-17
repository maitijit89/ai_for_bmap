import mongoose, { Schema, Document } from "mongoose";

export type HazardType =
  | "pothole_crater"
  | "flooding_waterlogging"
  | "construction_barricade"
  | "fallen_tree_debris"
  | "disabled_vehicle_shoulder"
  | "damaged_guardrail";

export type HazardSeverity = "low" | "medium" | "high" | "critical";

export interface BoundingBox {
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
  width: number; // 0.0 - 1.0
  height: number; // 0.0 - 1.0
}

export interface DetectedHazard {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  confidence: number; // 0.0 - 1.0
  bbox: BoundingBox;
  description: string;
}

export interface DetectedTrafficSign {
  signClass: "speed_limit" | "construction" | "yield" | "stop" | "curve_ahead" | "no_entry";
  textAnnotation?: string;
  speedLimitValueKmH?: number;
  digitalMapLimitKmH?: number;
  discrepancyFlag?: boolean;
  confidence: number;
}

export interface IVisionIncident extends Document {
  incidentId: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  hazards: DetectedHazard[];
  trafficSigns: DetectedTrafficSign[];
  coachingAdvice: string;
  capturedAt: Date;
  verified: boolean;
  roadName?: string;
}

const VisionIncidentSchema = new Schema<IVisionIncident>(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    hazards: [
      {
        id: String,
        type: String,
        severity: String,
        confidence: Number,
        bbox: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        description: String,
      },
    ],
    trafficSigns: [
      {
        signClass: String,
        textAnnotation: String,
        speedLimitValueKmH: Number,
        digitalMapLimitKmH: Number,
        discrepancyFlag: Boolean,
        confidence: Number,
      },
    ],
    coachingAdvice: String,
    capturedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: true },
    roadName: String,
  },
  { timestamps: true }
);

class BoundedArray<T> extends Array<T> {
  constructor(private maxItems: number = 500) {
    super();
  }

  override push(...items: T[]): number {
    const res = super.push(...items);
    while (this.length > this.maxItems) {
      this.shift();
    }
    return res;
  }
}

export const inMemoryIncidents = new BoundedArray<any>(500);

let VisionIncidentModel: mongoose.Model<IVisionIncident>;
try {
  VisionIncidentModel = mongoose.model<IVisionIncident>("VisionIncident", VisionIncidentSchema);
} catch {
  VisionIncidentModel = mongoose.model<IVisionIncident>("VisionIncident");
}

export { VisionIncidentModel };
