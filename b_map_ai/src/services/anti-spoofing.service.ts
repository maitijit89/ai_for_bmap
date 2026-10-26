/**
 * ============================================================================
 *           B-MAP AI: ANTI-GPS SPOOFING & KINEMATIC PLAUSIBILITY
 * ============================================================================
 * Enforces Rule 4.1: Kinematic Physics Plausibility Bounds
 */

export interface TelemetryPoint {
  coordinates: [number, number]; // [lon, lat]
  timestamp?: number;
  speedKmH?: number;
  headingDeg?: number;
  accuracyMeters?: number;
  isFromMockProvider?: boolean;
}

export interface SpoofingAssessment {
  isPlausible: boolean;
  flags: string[];
  riskScore: number; // 0 to 100
  sanitized: boolean;
  details: {
    acceleration?: number;
    speedKmH?: number;
    bearingDeltaDeg?: number;
    spatialVariance?: number;
  };
}

export class AntiSpoofingService {
  public static readonly MAX_ACCELERATION_MS2 = 6.5; // theoretical ceiling for civilian surface vehicles
  public static readonly MAX_SPEED_KMH = 220.0; // max plausible highway velocity
  public static readonly MAX_BEARING_DISPLACEMENT_DELTA_DEG = 70.0;
  public static readonly MIN_MICRO_ENTROPY_VARIANCE = 1e-9;

  /**
   * Assesses a telemetry point (or pair of points) for GPS spoofing anomalies.
   */
  public static assessTelemetry(
    current: TelemetryPoint,
    previous?: TelemetryPoint
  ): SpoofingAssessment {
    const flags: string[] = [];
    let riskScore = 0;
    const details: SpoofingAssessment["details"] = {};

    // 1. Android Mock Location Flag Check
    if (current.isFromMockProvider === true) {
      flags.push("MOCK_LOCATION_FLAG");
      riskScore += 80;
    }

    // 2. Maximum Plausible Speed Check
    const currentSpeed = current.speedKmH ?? 0;
    details.speedKmH = currentSpeed;
    if (currentSpeed > this.MAX_SPEED_KMH) {
      flags.push("TELEPORTATION_ANOMALY");
      riskScore += 90;
    }

    // 3. Differential checks against previous fix
    if (previous && previous.coordinates && current.coordinates) {
      const dtSeconds = previous.timestamp && current.timestamp
        ? Math.max(0.1, (current.timestamp - previous.timestamp) / 1000)
        : 1.0;

      const distMeters = this.computeHaversineDistance(
        previous.coordinates,
        current.coordinates
      );

      // Derived speed from displacement
      const derivedSpeedKmh = (distMeters / dtSeconds) * 3.6;
      if (derivedSpeedKmh > this.MAX_SPEED_KMH) {
        if (!flags.includes("TELEPORTATION_ANOMALY")) {
          flags.push("TELEPORTATION_ANOMALY");
          riskScore += 90;
        }
      }

      // Acceleration calculation
      const vPrevMs = (previous.speedKmH ?? (derivedSpeedKmh / 3.6)) * (1000 / 3600);
      const vCurrMs = (current.speedKmH ?? (derivedSpeedKmh / 3.6)) * (1000 / 3600);
      const acceleration = Math.abs(vCurrMs - vPrevMs) / dtSeconds;
      details.acceleration = Math.round(acceleration * 100) / 100;

      if (acceleration > this.MAX_ACCELERATION_MS2) {
        flags.push("IMPOSSIBLE_ACCELERATION");
        riskScore += 70;
      }

      // Bearing vs. Displacement Concordance
      if (currentSpeed > 15.0 && distMeters > 5.0 && current.headingDeg !== undefined) {
        const displacementBearing = this.computeBearing(
          previous.coordinates,
          current.coordinates
        );
        const bearingDelta = Math.abs(
          ((current.headingDeg - displacementBearing + 180) % 360) - 180
        );
        details.bearingDeltaDeg = Math.round(bearingDelta * 10) / 10;

        if (bearingDelta > this.MAX_BEARING_DISPLACEMENT_DELTA_DEG) {
          flags.push("BEARING_DISPLACEMENT_MISMATCH");
          riskScore += 50;
        }
      }

      // Spatial Micro-Entropy Check
      if (currentSpeed > 2.0 && distMeters === 0) {
        // Report moving speed but 0 coordinate change indicates synthetic injection
        flags.push("SYNTHETIC_ZERO_JITTER");
        riskScore += 40;
      }
    }

    const cappedRiskScore = Math.min(100, riskScore);
    const isPlausible = flags.length === 0;

    return {
      isPlausible,
      flags,
      riskScore: cappedRiskScore,
      sanitized: !isPlausible,
      details,
    };
  }

  /**
   * Great-circle distance between [lon1, lat1] and [lon2, lat2] in meters.
   */
  public static computeHaversineDistance(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Forward initial bearing from coord1 to coord2 in degrees (0-360).
   */
  public static computeBearing(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    return ((theta * 180) / Math.PI + 360) % 360;
  }
}
