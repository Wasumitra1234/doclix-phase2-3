import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[API Error]", err);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && err.stack ? { stack: err.stack } : {}),
  });
}
