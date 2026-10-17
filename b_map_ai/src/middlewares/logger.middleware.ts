import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

/**
 * Enterprise HTTP request logger with correlation ID tracking and latency profiling
 */
export function requestLogger(req: RequestWithId, res: Response, next: NextFunction): void {
  const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = reqId;
  req.startTime = Date.now();

  res.setHeader("X-Request-Id", reqId);

  const timestamp = new Date().toISOString();
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-";

  // Capture completion log
  res.on("finish", () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const status = res.statusCode;
    const statusColor = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
    const reset = "\x1b[0m";

    console.log(
      `[${timestamp}] [${reqId.slice(0, 8)}] ${req.method} ${req.originalUrl || req.url} ` +
      `${statusColor}${status}${reset} - ${duration}ms - IP: ${clientIp}`
    );
  });

  next();
}
