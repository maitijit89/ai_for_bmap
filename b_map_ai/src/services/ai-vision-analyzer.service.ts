import {
  DetectedHazard,
  DetectedTrafficSign,
  VisionIncidentModel,
  inMemoryIncidents,
} from "../models/ai-vision-incident.model";
import { PostgresManager } from "../config/postgres";

export interface ParkingOccupancyResult {
  facilityId: string;
  totalStalls: number;
  occupiedStalls: number;
  vacantStalls: number;
  occupancyPercentage: number;
  vacantEvChargingBays: number;
  recommendedAisle: string;
  timestamp: string;
}

export class AiVisionAnalyzerService {
  /**
   * Analyze road scene dashcam/camera feed
   */
  public static async analyzeRoadScene(input: {
    coordinates?: [number, number]; // [lng, lat]
    currentTelemetry?: any;
    roadName?: string;
    currentSpeedKmH?: number;
    digitalMapSpeedLimitKmH?: number;
    rawImageBase64?: string;
    imageUrl?: string;
  }) {
    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mapLimit = input.digitalMapSpeedLimitKmH || 50;

    // Simulated multi-class detector based on scene characteristics
    const hazards: DetectedHazard[] = [
      {
        id: `hz_1`,
        type: "pothole_crater",
        severity: "high",
        confidence: 0.94,
        bbox: { x: 0.62, y: 0.71, width: 0.18, height: 0.12 },
        description: "Significant asphalt crater detected in right driving lane.",
      },
      {
        id: `hz_2`,
        type: "construction_barricade",
        severity: "medium",
        confidence: 0.91,
        bbox: { x: 0.75, y: 0.45, width: 0.22, height: 0.35 },
        description: "Orange channelizing cones and lane closure barricade ahead.",
      },
    ];

    // Traffic sign OCR
    const detectedSpeedLimit = 30;
    const trafficSigns: DetectedTrafficSign[] = [
      {
        signClass: "speed_limit",
        textAnnotation: "30 km/h",
        speedLimitValueKmH: detectedSpeedLimit,
        digitalMapLimitKmH: mapLimit,
        discrepancyFlag: detectedSpeedLimit !== mapLimit,
        confidence: 0.97,
      },
      {
        signClass: "construction",
        textAnnotation: "Work Ahead 200m",
        confidence: 0.89,
      },
    ];

    // Synthesize actionable driver coaching advice
    const coachingAdvice = this.synthesizeCoachingAdvice(
      hazards,
      trafficSigns,
      input.currentSpeedKmH || 48
    );

    const record = {
      incidentId,
      location: {
        type: "Point" as const,
        coordinates: input.coordinates || input.currentTelemetry?.coordinates || [77.2177, 28.6304],
      },
      hazards,
      trafficSigns,
      coachingAdvice,
      capturedAt: new Date(),
      verified: true,
      roadName: input.roadName || "Active Corridor",
    };

    // Save in-memory
    inMemoryIncidents.push(record);

    // Save to Neon PostgreSQL
    try {
      const primaryHazard = hazards[0] || { type: "general_hazard", severity: "medium", confidence: 1.0 };
      const speedSign = trafficSigns.find((s) => s.signClass === "speed_limit");
      await PostgresManager.query(
        `INSERT INTO vision_incidents (
           incident_id, incident_type, severity, confidence,
           coordinates, longitude, latitude, speed_limit_detected,
           advisory, reported_at, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
         ON CONFLICT (incident_id) DO NOTHING`,
        [
          incidentId,
          primaryHazard.type,
          primaryHazard.severity,
          primaryHazard.confidence,
          JSON.stringify(record.location.coordinates),
          record.location.coordinates[0],
          record.location.coordinates[1],
          speedSign ? `${speedSign.speedLimitValueKmH} km/h` : null,
          coachingAdvice,
          "active",
        ]
      );
    } catch (pgErr: any) {
      console.warn(`[AiVisionAnalyzer] PostgreSQL notice: ${pgErr.message}`);
    }

    // Save MongoDB if available
    try {
      await VisionIncidentModel.create(record);
    } catch {
      // In-memory fallback
    }

    return record;
  }

  /**
   * Actionable Driver Coaching Synthesizer
   */
  public static synthesizeCoachingAdvice(
    hazards: DetectedHazard[],
    signs: DetectedTrafficSign[],
    currentSpeedKmH: number
  ): string {
    const parts: string[] = [];

    const speedSign = signs.find((s) => s.signClass === "speed_limit");
    if (speedSign && speedSign.speedLimitValueKmH) {
      if (currentSpeedKmH > speedSign.speedLimitValueKmH) {
        parts.push(
          `Temporary ${speedSign.speedLimitValueKmH} km/h speed zone detected. Slow down from ${currentSpeedKmH.toFixed(0)} km/h.`
        );
      }
    }

    const pothole = hazards.find((h) => h.type === "pothole_crater");
    if (pothole) {
      parts.push("Significant pothole detected in right lane. Shift to left lane to avoid wheel impact.");
    }

    const construction = hazards.find((h) => h.type === "construction_barricade");
    if (construction) {
      parts.push("Caution: Active construction zone ahead with lane tapering.");
    }

    return (
      parts.join(" ") ||
      "Road clear ahead. Maintain safe following distance and observe lane markings."
    );
  }

  /**
   * CCTV Parking Lot Occupancy Estimation
   */
  public static estimateParkingOccupancy(facilityId: string): ParkingOccupancyResult {
    const totalStalls = 120;
    const occupiedStalls = 84;
    const vacantStalls = totalStalls - occupiedStalls;
    const occupancyPercentage = Math.round((occupiedStalls / totalStalls) * 100);
    const vacantEvChargingBays = 6;
    const recommendedAisle = "Aisle B (Near Elevator Column Green-4)";

    return {
      facilityId,
      totalStalls,
      occupiedStalls,
      vacantStalls,
      occupancyPercentage,
      vacantEvChargingBays,
      recommendedAisle,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieve nearby vision-verified incidents within radial buffer (in meters)
   */
  public static async findNearbyIncidents(
    coordinates: [number, number],
    radiusMeters: number = 5000
  ) {
    // Try MongoDB 2dsphere $near
    try {
      const mongoResults = await VisionIncidentModel.find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates },
            $maxDistance: radiusMeters,
          },
        },
      })
        .limit(20)
        .lean()
        .exec();

      if (mongoResults && mongoResults.length > 0) return mongoResults;
    } catch {
      // In-memory fallback
    }

    // In-memory Haversine distance filter
    return inMemoryIncidents.filter((inc) => {
      if (!inc?.location?.coordinates || !Array.isArray(inc.location.coordinates) || inc.location.coordinates.length < 2) {
        return false;
      }
      const dist = this.haversineDistanceMeters(
        coordinates[1],
        coordinates[0],
        inc.location.coordinates[1],
        inc.location.coordinates[0]
      );
      return dist <= radiusMeters;
    });
  }

  private static haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const clampedA = Math.min(1, Math.max(0, a));
    const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

    return R * c;
  }
}
