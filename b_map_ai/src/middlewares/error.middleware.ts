import { Request, Response, NextFunction } from "express";

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: "Endpoint not found. Visit GET / for available API routes.",
  });
}

/**
 * Global Exception & Error Handler Middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[B Map AI Global Error]", err);
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === "production";

  // Prevent internal database errors, file paths, and stack traces from leaking to clients
  const safeMessage = isProd && status >= 500
    ? "An internal server error occurred. Please contact administrator with your Request-Id."
    : (err.message || "An unexpected internal error occurred.");

  res.status(status).json({
    success: false,
    error: safeMessage,
    requestId: (req as any).id,
  });
}
