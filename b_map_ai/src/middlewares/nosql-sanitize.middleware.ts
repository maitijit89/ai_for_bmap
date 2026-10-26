import { Request, Response, NextFunction } from "express";

/**
 * Deeply sanitizes an object by recursively stripping keys that start with '$'
 * or contain nested dots ('.'), which are commonly used in NoSQL operator injection attacks.
 */
export function sanitizeNoSqlPayload<T>(target: T): T {
  if (target === null || target === undefined || typeof target !== "object") {
    // Also clean null bytes in string values
    if (typeof target === "string" && target.includes("\0")) {
      return target.replace(/\0/g, "") as unknown as T;
    }
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeNoSqlPayload(item)) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(target)) {
    // Strip keys starting with '$' (e.g. $gt, $ne, $where, $regex) or containing dot notation
    if (key.startsWith("$") || key.includes(".")) {
      console.warn(`[NoSqlSanitizer] Stripped suspicious operator key: "${key}"`);
      continue;
    }

    cleanObj[key] = sanitizeNoSqlPayload(value);
  }

  return cleanObj as T;
}

/**
 * Express Middleware: NoSQL Query Injection Sanitizer
 * 
 * Enforces Rule 2.5:
 * Neutralizes query selector injection across req.body, req.query, and req.params.
 */
export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeNoSqlPayload(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeNoSqlPayload(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeNoSqlPayload(req.params);
  }

  next();
}
