import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth/auth.service";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token =
    header?.startsWith("Bearer ") ? header.slice(7) : (req as any).cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err: any) {
    return res.status(err.status || 401).json({ error: err.message || "Unauthorized" });
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
