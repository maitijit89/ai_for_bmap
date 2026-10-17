import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Reusable Zod request validator middleware.
 * Validates request body, query, or params against a Zod schema.
 */
export function validateRequest(
  schema: ZodSchema<any>,
  source: "body" | "query" | "params" = "body"
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req[source]);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Request validation failed.",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
