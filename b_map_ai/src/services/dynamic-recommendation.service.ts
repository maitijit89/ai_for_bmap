export interface DynamicRecommendation {
  type: "destination_parking" | "faster_route" | "low_energy_alert" | "fatigue_break";
  title: string;
  message: string;
  timeSavingsMinutes?: number;
  actionPayload?: Record<string, any>;
  priority: "low" | "medium" | "high" | "critical";
}

export class DynamicRecommendationService {
  /**
   * Dynamic Congestion Re-Weighting using the BPR (Bureau of Public Roads) Flow Model:
   * w_e = t_free * [ 1 + alpha * ( (v_free - v_actual) / v_free )^beta ]
   * alpha = 0.65, beta = 2.0
   */
  public static calculateBprWeight(
    tFreeSeconds: number,
    vFreeKmH: number,
    vActualKmH: number,
    alpha: number = 0.65,
    beta: number = 2.0
  ): { weightedDurationSeconds: number; congestionDelaySeconds: number } {
    const safeTFree = Math.max(0, isNaN(tFreeSeconds) ? 0 : tFreeSeconds);
    const safeVFree = Math.max(5, isNaN(vFreeKmH) ? 50 : vFreeKmH);
    const safeVActual = Math.max(1, isNaN(vActualKmH) ? safeVFree : vActualKmH);

    const clampedActual = Math.max(1, Math.min(safeVFree, safeVActual));
    const speedRatio = Math.max(0, (safeVFree - clampedActual) / safeVFree);

    const inflation = 1 + alpha * Math.pow(speedRatio, beta);
    const weightedDurationSeconds = Math.round(safeTFree * inflation);
    const congestionDelaySeconds = weightedDurationSeconds - safeTFree;

    return {
      weightedDurationSeconds,
      congestionDelaySeconds,
    };
  }

  /**
   * Autonomous in-drive evaluator running across live vehicle telemetry
   */
  public static evaluateInDriveRecommendations(telemetry: {
    distanceToDestinationMeters: number;
    continuousDriveDurationSeconds: number;
    batteryOrFuelSoC: number;
    potentialBypassSavingsMinutes?: number;
    destinationName: string;
  }): DynamicRecommendation[] {
    const recommendations: DynamicRecommendation[] = [];

    // 1. Destination Parking Alert: within 2.0 km of destination
    if (telemetry.distanceToDestinationMeters <= 2000) {
      recommendations.push({
        type: "destination_parking",
        title: "Approaching Destination: Smart Parking Available",
        message: `${telemetry.destinationName} underground parking has 22 vacant bays. Would you like to reserve Level B2 Aisle C?`,
        priority: "high",
        actionPayload: { tool: "reserve_parking", facility: `${telemetry.destinationName} Parking Deck P1` },
      });
    }

    // 2. Faster Route Detection: >= 5 minutes can be saved
    if (
      telemetry.potentialBypassSavingsMinutes &&
      telemetry.potentialBypassSavingsMinutes >= 5
    ) {
      recommendations.push({
        type: "faster_route",
        title: "Faster Route Found Ahead",
        message: `Alternative expressway bypass saves ${telemetry.potentialBypassSavingsMinutes} minutes. Tap to reroute.`,
        timeSavingsMinutes: telemetry.potentialBypassSavingsMinutes,
        priority: "high",
        actionPayload: { tool: "switch_route", timeSavedMinutes: telemetry.potentialBypassSavingsMinutes },
      });
    }

    // 3. Low Fuel / Energy Replenishment: SoC <= 20%
    if (telemetry.batteryOrFuelSoC <= 20) {
      recommendations.push({
        type: "low_energy_alert",
        title: "Low Energy Alert",
        message: `Battery/fuel at ${telemetry.batteryOrFuelSoC}%. 2 high-speed charging/fuel stations located within 3 km.`,
        priority: "critical",
        actionPayload: { tool: "add_waypoint", category: "energy_replenishment" },
      });
    }

    // 4. Fatigue Break Monitor: continuous driving > 2 hours (7,200 seconds)
    if (telemetry.continuousDriveDurationSeconds >= 7200) {
      recommendations.push({
        type: "fatigue_break",
        title: "Driver Rest Break Recommended",
        message: "You have been driving continuously for over 2 hours. Service plaza coming up in 4 km with fresh coffee and rest areas.",
        priority: "medium",
        actionPayload: { tool: "add_waypoint", category: "rest_plaza" },
      });
    }

    return recommendations;
  }
}
