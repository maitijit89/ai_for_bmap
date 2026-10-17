export type MotionState = "DRIVING" | "CYCLING" | "WALKING" | "RUNNING" | "STILL";

export interface InertialSensorPayload {
  accelerometerMagnitude: number;
  gyroscopeAngularSpeed: number;
  gpsSpeedKmH: number;
  distanceToDestinationMeters: number;
  stillDurationSeconds: number;
  isInHighCongestionSegment?: boolean;
  currentRoutingProfile: "driving" | "walking" | "cycling";
}

export interface ActivityStateTransition {
  classifiedState: MotionState;
  suggestedAction?:
    | "prompt_arrival_confirmation"
    | "trigger_traffic_delay_alert"
    | "auto_pause_navigation"
    | "auto_resume_navigation"
    | "suggest_switch_to_walking"
    | "none";
  alertMessage?: string;
}

export class ActivityRecognitionService {
  /**
   * Classify user physical motion state and trigger intelligent state transitions
   */
  public static classifyActivity(sensor: InertialSensorPayload): ActivityStateTransition {
    let state: MotionState = "STILL";

    if (sensor.gpsSpeedKmH > 25) {
      state = "DRIVING";
    } else if (sensor.gpsSpeedKmH > 10 && sensor.gpsSpeedKmH <= 25) {
      state = sensor.accelerometerMagnitude > 1.2 ? "CYCLING" : "DRIVING";
    } else if (sensor.gpsSpeedKmH > 4 && sensor.gpsSpeedKmH <= 10) {
      state = sensor.accelerometerMagnitude > 2.0 ? "RUNNING" : "WALKING";
    } else if (sensor.gpsSpeedKmH > 1 && sensor.gpsSpeedKmH <= 4) {
      state = "WALKING";
    } else {
      state = "STILL";
    }

    // Intelligent State Transitions
    if (state === "STILL" && sensor.stillDurationSeconds >= 300) {
      // 1. STILL > 5 mins within 150m of destination -> arrival confirmation
      if (sensor.distanceToDestinationMeters <= 150) {
        return {
          classifiedState: state,
          suggestedAction: "prompt_arrival_confirmation",
          alertMessage: "You appear to have arrived at your destination. Confirm arrival and finish navigation?",
        };
      }

      // 2. STILL > 5 mins in congestion segment -> traffic delay alert
      if (sensor.isInHighCongestionSegment) {
        return {
          classifiedState: state,
          suggestedAction: "trigger_traffic_delay_alert",
          alertMessage: "Heavy traffic detected ahead. Would you like B Map AI to search for an active detour bypass?",
        };
      }

      // 3. STILL > 5 mins idle -> auto-pause session to save battery
      return {
        classifiedState: state,
        suggestedAction: "auto_pause_navigation",
        alertMessage: "Vehicle stationary for 5+ minutes. Navigation auto-paused to conserve battery.",
      };
    }

    // 4. Activity mismatch: driver starts walking while routing profile is driving
    if (state === "WALKING" && sensor.currentRoutingProfile === "driving") {
      return {
        classifiedState: state,
        suggestedAction: "suggest_switch_to_walking",
        alertMessage: "Detected walking pace. Would you like to switch to pedestrian last-meter navigation?",
      };
    }

    return {
      classifiedState: state,
      suggestedAction: "none",
    };
  }
}
