import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import config from "../config";

/**
 * Helmet HTTP security headers middleware configuration
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: "deny",
  },
  noSniff: true,
  hidePoweredBy: true,
});

/**
 * Global rate limiter: prevents abusive bursts across standard API endpoints
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this client. Please slow down and retry in a moment.",
  },
});

/**
 * Strict rate limiter for compute-heavy LLM inference endpoints
 */
export const inferenceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 inference calls/min per client
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Inference rate limit exceeded. Please throttle model requests.",
  },
});

/**
 * Cryptographically Secure API Key Authentication Guard
 * Uses constant-time comparison to prevent side-channel timing attacks (CWE-208)
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // If no API key configured, pass through only in non-production
  if (!config.apiKey) {
    if (config.nodeEnv === "production") {
      res.status(500).json({
        success: false,
        error: "Server configuration error: BMAP_API_KEY must be configured in production.",
      });
      return;
    }
    return next();
  }

  const rawKey = (req.headers["x-api-key"] as string) || (req.query.api_key as string);
  if (!rawKey) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Missing X-API-KEY header.",
    });
    return;
  }

  const expectedKeyBuffer = Buffer.from(config.apiKey);
  const providedKeyBuffer = Buffer.from(rawKey);

  if (
    expectedKeyBuffer.length !== providedKeyBuffer.length ||
    !crypto.timingSafeEqual(expectedKeyBuffer, providedKeyBuffer)
  ) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid API key.",
    });
    return;
  }

  next();
}
