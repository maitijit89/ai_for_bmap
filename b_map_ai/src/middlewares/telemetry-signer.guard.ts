import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import config from "../config";

const MAX_TIMESTAMP_DRIFT_MS = 45000; // 45 seconds (Rule 3.2)
const NONCE_CACHE_TTL_MS = 60000; // 60 seconds nonce retention

/**
 * In-memory sliding cache for nonce deduplication
 */
class NonceCache {
  private static nonces = new Map<string, number>();

  public static has(nonce: string): boolean {
    this.evictExpired();
    return this.nonces.has(nonce);
  }

  public static add(nonce: string): void {
    this.evictExpired();
    this.nonces.set(nonce, Date.now());
  }

  private static evictExpired(): void {
    const now = Date.now();
    for (const [nonce, timestamp] of this.nonces.entries()) {
      if (now - timestamp > NONCE_CACHE_TTL_MS) {
        this.nonces.delete(nonce);
      }
    }
  }

  public static clear(): void {
    this.nonces.clear();
  }
}

/**
 * Computes canonical HMAC-SHA256 signature for telemetry payloads.
 */
export function computeTelemetryHmac(
  secretKey: string,
  timestamp: string | number,
  nonce: string,
  payload: string | object
): string {
  const serializedPayload =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const canonicalString = `${timestamp}:${nonce}:${serializedPayload}`;

  return crypto
    .createHmac("sha256", secretKey)
    .update(canonicalString)
    .digest("hex");
}

/**
 * Telemetry Signer & Anti-Replay Guard Middleware
 * 
 * Enforces Rule 3.1 & 3.2:
 * 1. Verifies X-BMap-Signature, X-BMap-Timestamp, and X-BMap-Nonce
 * 2. Enforces 45-second freshness window
 * 3. Enforces sliding nonce deduplication to eliminate replay attacks
 */
export function telemetrySignerGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers["x-bmap-signature"] as string | undefined;
  const timestampStr = req.headers["x-bmap-timestamp"] as string | undefined;
  const nonce = req.headers["x-bmap-nonce"] as string | undefined;

  // In non-production or if bypass configured, allow missing headers with warning
  const isEnforced =
    process.env.NODE_ENV === "production" ||
    Boolean(signature || timestampStr || nonce);

  if (!isEnforced) {
    return next();
  }

  if (!signature || !timestampStr || !nonce) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Telemetry signature missing: X-BMap-Signature, X-BMap-Timestamp, and X-BMap-Nonce headers are required.",
    });
    return;
  }

  // 1. Nonce length check (min 16 chars)
  if (nonce.length < 16) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid X-BMap-Nonce: Cryptographic nonce must be at least 16 characters long.",
    });
    return;
  }

  // 2. Freshness check: |T_server - T_client| <= 45,000 ms
  const clientTime = parseInt(timestampStr, 10);
  if (isNaN(clientTime)) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid X-BMap-Timestamp: Timestamp must be an epoch millisecond integer.",
    });
    return;
  }

  const now = Date.now();
  const drift = Math.abs(now - clientTime);
  if (drift > MAX_TIMESTAMP_DRIFT_MS) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: `Telemetry timestamp expired or clock skew exceeded: drift of ${drift}ms exceeds 45s threshold.`,
    });
    return;
  }

  // 3. Replay protection: Nonce deduplication
  if (NonceCache.has(nonce)) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: "NONCE_REPLAY_DETECTED: Cryptographic nonce has already been consumed.",
    });
    return;
  }

  // 4. HMAC-SHA256 signature verification
  const secret = config.apiKey || config.jwtSecret || "bmap_telemetry_shared_secret";
  const expectedSignature = computeTelemetryHmac(
    secret,
    timestampStr,
    nonce,
    req.body || {}
  );

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expectedSignature, "hex");

  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid telemetry cryptographic signature.",
    });
    return;
  }

  // Register nonce in cache
  NonceCache.add(nonce);
  next();
}

export { NonceCache };
