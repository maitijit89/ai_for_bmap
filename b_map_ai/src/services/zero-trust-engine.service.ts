import { AntiSpoofingService, SpoofingAssessment, TelemetryPoint } from "./anti-spoofing.service";

export interface ZeroTrustEvaluationRequest {
  clientIp?: string;
  telemetry?: TelemetryPoint;
  previousTelemetry?: TelemetryPoint;
  hasValidSignature?: boolean;
  hasReplayProtection?: boolean;
}

export interface ZeroTrustVerdict {
  verdict: "ALLOW" | "CHALLENGE" | "DROP";
  trustScore: number; // 0 (hostile) to 100 (fully verified)
  anomaliesDetected: string[];
  spoofingAssessment?: SpoofingAssessment;
  timestamp: string;
}

export class ZeroTrustEngineService {
  /**
   * Assesses an incoming telematics connection or request under Zero-Trust rules.
   */
  public static evaluateRequest(
    req: ZeroTrustEvaluationRequest
  ): ZeroTrustVerdict {
    const anomalies: string[] = [];
    let trustScore = 100;

    // 1. Telemetry Kinematics & Spoofing Evaluation
    let spoofing: SpoofingAssessment | undefined;
    if (req.telemetry) {
      spoofing = AntiSpoofingService.assessTelemetry(
        req.telemetry,
        req.previousTelemetry
      );
      if (!spoofing.isPlausible) {
        anomalies.push(...spoofing.flags);
        trustScore -= spoofing.riskScore * 0.7;
      }
    }

    // 2. Cryptographic Signature Evaluation
    if (req.hasValidSignature === false) {
      anomalies.push("INVALID_CRYPTOGRAPHIC_SIGNATURE");
      trustScore -= 50;
    }

    // 3. Replay Protection Evaluation
    if (req.hasReplayProtection === false) {
      anomalies.push("REPLAY_PROTECTION_ABSENT");
      trustScore -= 20;
    }

    const normalizedTrustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

    let verdict: "ALLOW" | "CHALLENGE" | "DROP" = "ALLOW";
    if (normalizedTrustScore < 40) {
      verdict = "DROP";
    } else if (normalizedTrustScore < 75) {
      verdict = "CHALLENGE";
    }

    return {
      verdict,
      trustScore: normalizedTrustScore,
      anomaliesDetected: anomalies,
      spoofingAssessment: spoofing,
      timestamp: new Date().toISOString(),
    };
  }
}
