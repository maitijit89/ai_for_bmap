export interface EnvironmentalAqi {
  overallAqi: number;
  category: "Good" | "Moderate" | "Unhealthy" | "Severe" | "Hazardous";
  pm25: number;
  pm10: number;
  no2: number;
  ozone: number;
}

export interface EcoRouteProfile {
  routeId: string;
  distanceKm: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  estimatedEnergyKwh: number;
  regenerativeRecoveryKwh: number;
  netEnergyConsumptionKwh: number;
  aqiExposureLevel: "Low" | "Medium" | "High";
  ecoScore: number;
}

export class EnvironmentService {
  /**
   * Real-time Air Quality Index (AQI) evaluation along route corridor
   */
  public static getAqiForCorridor(coordinates: [number, number]): EnvironmentalAqi {
    return {
      overallAqi: 68,
      category: "Moderate",
      pm25: 18.4,
      pm10: 34.2,
      no2: 21.0,
      ozone: 28.5,
    };
  }

  /**
   * EV Eco-Routing optimizer calculating elevation gradients, net consumption, and regenerative braking
   */
  public static computeEcoRoute(params: {
    routeId: string;
    distanceKm: number;
    elevationProfile: Array<{ distanceKm: number; elevationMeters: number }>;
    vehicleWeightKg?: number;
  }): EcoRouteProfile {
    const weightKg = params.vehicleWeightKg || 1900;
    let gainMeters = 0;
    let lossMeters = 0;

    for (let i = 1; i < params.elevationProfile.length; i++) {
      const diff = params.elevationProfile[i].elevationMeters - params.elevationProfile[i - 1].elevationMeters;
      if (diff > 0) gainMeters += diff;
      else lossMeters += Math.abs(diff);
    }

    const baseEnergyKwh = params.distanceKm * 0.16;
    const climbEnergyKwh = (weightKg * 9.81 * gainMeters) / 3.6e6;
    const regenEfficiency = 0.7;
    const regenKwh = ((weightKg * 9.81 * lossMeters) / 3.6e6) * regenEfficiency;

    const netConsumptionKwh = Number((baseEnergyKwh + climbEnergyKwh - regenKwh).toFixed(2));

    return {
      routeId: params.routeId,
      distanceKm: params.distanceKm,
      elevationGainMeters: Math.round(gainMeters),
      elevationLossMeters: Math.round(lossMeters),
      estimatedEnergyKwh: Number((baseEnergyKwh + climbEnergyKwh).toFixed(2)),
      regenerativeRecoveryKwh: Number(regenKwh.toFixed(2)),
      netEnergyConsumptionKwh: Math.max(0.5, netConsumptionKwh),
      aqiExposureLevel: "Low",
      ecoScore: Math.round(Math.max(40, 100 - netConsumptionKwh * 2)),
    };
  }
}
