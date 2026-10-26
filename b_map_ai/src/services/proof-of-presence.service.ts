import crypto from "crypto";
import config from "../config";
import { AntiSpoofingService } from "./anti-spoofing.service";

export interface ProofOfPresenceAttestation {
  attestationId: string;
  subjectId: string;
  targetCoordinate: [number, number];
  geofenceRadiusMeters: number;
  actualObservedCoordinate: [number, number];
  distanceFromCentroidMeters: number;
  rawBreadcrumbHash: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export interface IssueAttestationParams {
  subjectId: string;
  targetCoordinate: [number, number];
  geofenceRadiusMeters: number;
  actualObservedCoordinate: [number, number];
  rawBreadcrumbs?: any[];
}

export interface VerifyAttestationResult {
  isValid: boolean;
  reason?: string;
  attestation?: ProofOfPresenceAttestation;
}

export class ProofOfPresenceService {
  public static readonly ATTESTATION_TTL_MS = 30 * 60 * 1000; // 30 minutes (Rule 10.2)

  /**
   * Issues a cryptographically signed Proof-of-Presence attestation certificate.
   */
  public static issueAttestation(
    params: IssueAttestationParams
  ): ProofOfPresenceAttestation {
    const {
      subjectId,
      targetCoordinate,
      geofenceRadiusMeters,
      actualObservedCoordinate,
      rawBreadcrumbs = [],
    } = params;

    // Calculate actual distance from geofence centroid
    const dist = AntiSpoofingService.computeHaversineDistance(
      targetCoordinate,
      actualObservedCoordinate
    );

    if (dist > geofenceRadiusMeters) {
      throw new Error(
        `OUT_OF_GEOFENCE: Observed coordinate is ${Math.round(dist)}m away, exceeding radius of ${geofenceRadiusMeters}m.`
      );
    }

    const attestationId = crypto.randomUUID();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + this.ATTESTATION_TTL_MS;

    // Compute SHA-256 hash of raw breadcrumbs or coordinates
    const breadcrumbData =
      rawBreadcrumbs.length > 0
        ? JSON.stringify(rawBreadcrumbs)
        : JSON.stringify({ actualObservedCoordinate, targetCoordinate, issuedAt });

    const rawBreadcrumbHash = crypto
      .createHash("sha256")
      .update(breadcrumbData)
      .digest("hex");

    // Canonical payload for cryptographic signing
    const payloadToSign = `${attestationId}:${subjectId}:${targetCoordinate.join(",")}:${actualObservedCoordinate.join(",")}:${geofenceRadiusMeters}:${rawBreadcrumbHash}:${issuedAt}:${expiresAt}`;

    const secret = config.apiKey || config.jwtSecret || "bmap_proof_of_presence_secret";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payloadToSign)
      .digest("hex");

    return {
      attestationId,
      subjectId,
      targetCoordinate,
      geofenceRadiusMeters,
      actualObservedCoordinate,
      distanceFromCentroidMeters: Math.round(dist * 10) / 10,
      rawBreadcrumbHash,
      issuedAt,
      expiresAt,
      signature,
    };
  }

  /**
   * Verifies an attestation certificate against expiration and cryptographic tampering.
   */
  public static verifyAttestation(
    certificate: ProofOfPresenceAttestation
  ): VerifyAttestationResult {
    if (!certificate || !certificate.signature || !certificate.attestationId) {
      return { isValid: false, reason: "Malformed or incomplete attestation certificate." };
    }

    // 1. Expiration check (Rule 10.2: 30 minutes TTL)
    const now = Date.now();
    if (now > certificate.expiresAt) {
      return { isValid: false, reason: "ATTESTATION_EXPIRED: Certificate has expired." };
    }

    // 2. Recompute HMAC-SHA256 signature
    const payloadToSign = `${certificate.attestationId}:${certificate.subjectId}:${certificate.targetCoordinate.join(",")}:${certificate.actualObservedCoordinate.join(",")}:${certificate.geofenceRadiusMeters}:${certificate.rawBreadcrumbHash}:${certificate.issuedAt}:${certificate.expiresAt}`;

    const secret = config.apiKey || config.jwtSecret || "bmap_proof_of_presence_secret";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadToSign)
      .digest("hex");

    const sigBuf = Buffer.from(certificate.signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return { isValid: false, reason: "SIGNATURE_TAMPERED: Cryptographic signature mismatch." };
    }

    return {
      isValid: true,
      attestation: certificate,
    };
  }
}
