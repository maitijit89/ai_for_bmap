import { Request, Response, NextFunction } from "express";
import { AntiSpoofingService, SpoofingAssessment } from "../services/anti-spoofing.service";

/**
 * Express Middleware: Anti-GPS Spoofing & Kinematic Plausibility Guard
 * 
 * Enforces Rule 4.1:
 * Validates incoming vehicle telemetry against surface kinematics.
 */
export function antiSpoofingGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const telemetry = req.body?.telemetry || req.body?.currentTelemetry || req.body;

  if (telemetry && telemetry.coordinates && Array.isArray(telemetry.coordinates)) {
    const assessment = AntiSpoofingService.assessTelemetry({
      coordinates: telemetry.coordinates as [number, number],
      speedKmH: telemetry.speedKmH,
      headingDeg: telemetry.headingDeg,
      isFromMockProvider: telemetry.isFromMockProvider,
    });

    (req as any).spoofingAssessment = assessment;

    // In production, reject extreme teleportation jumps or mock locations if crowdsourcing
    if (!assessment.isPlausible && assessment.riskScore >= 90) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: "KINEMATIC_PLAUSIBILITY_VIOLATION: Telemetry data violates physical kinematic bounds.",
        flags: assessment.flags,
        riskScore: assessment.riskScore,
      });
      return;
    }
  }

  next();
}
