export interface PerceptionObstacle {
  id: string;
  type: "car" | "truck" | "bus" | "motorcycle" | "bicycle" | "pedestrian" | "traffic_cone" | "barrier";
  lateralOffsetMeters: number; // Negative = left, positive = right
  longitudinalDistanceMeters: number; // Distance in front
  relativeSpeedKmH: number; // Negative = closing in
}

export interface AdasAssessment {
  timeToCollisionSeconds: number | null;
  forwardCollisionWarning: boolean;
  cutInWarning: boolean;
  laneDepartureWarning: {
    active: boolean;
    driftDirection?: "left" | "right";
    distanceToBoundaryMeters: number;
    warningType?: "visual" | "haptic" | "audio";
  };
  trackedObstacles: PerceptionObstacle[];
}

export class SrNavigationService {
  /**
   * Spatial Reality (SR) Perception & ADAS Collision Avoidance
   */
  public static computeAdasState(input: {
    obstacles: PerceptionObstacle[];
    egoSpeedKmH: number;
    distanceToLeftBoundaryMeters: number;
    distanceToRightBoundaryMeters: number;
    turnSignalActive: boolean;
  }): AdasAssessment {
    let minTtc: number | null = null;
    let forwardCollisionWarning = false;
    let cutInWarning = false;
    const obstacles = Array.isArray(input.obstacles) ? input.obstacles : [];

    for (const obs of obstacles) {
      const relSpeedMs = (obs.relativeSpeedKmH * 1000) / 3600;

      if (obs.longitudinalDistanceMeters > 0 && relSpeedMs < 0) {
        const ttc = obs.longitudinalDistanceMeters / Math.abs(relSpeedMs);
        if (minTtc === null || ttc < minTtc) {
          minTtc = ttc;
        }

        if (ttc < 2.5 && Math.abs(obs.lateralOffsetMeters) < 1.0) {
          forwardCollisionWarning = true;
        }

        if (Math.abs(obs.lateralOffsetMeters) < 1.8 && ttc < 3.0) {
          cutInWarning = true;
        }
      }
    }

    let ldwActive = false;
    let driftDir: "left" | "right" | undefined = undefined;
    let distBoundary = Math.min(input.distanceToLeftBoundaryMeters, input.distanceToRightBoundaryMeters);

    if (!input.turnSignalActive) {
      if (input.distanceToLeftBoundaryMeters < 0.25) {
        ldwActive = true;
        driftDir = "left";
      } else if (input.distanceToRightBoundaryMeters < 0.25) {
        ldwActive = true;
        driftDir = "right";
      }
    }

    return {
      timeToCollisionSeconds: minTtc !== null ? Number(minTtc.toFixed(2)) : null,
      forwardCollisionWarning,
      cutInWarning,
      laneDepartureWarning: {
        active: ldwActive,
        driftDirection: driftDir,
        distanceToBoundaryMeters: Number(distBoundary.toFixed(2)),
        warningType: ldwActive ? "haptic" : undefined,
      },
      trackedObstacles: input.obstacles,
    };
  }
}
