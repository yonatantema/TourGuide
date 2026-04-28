import { Request, Response, NextFunction } from "express";

// Mount AFTER requireAuth. Rejects any request from a user whose
// platform_role is not 'platform_admin'. Used to gate all /api/platform/*
// routes (cross-customer config edited by TEMA Creative employees).
export function requirePlatformAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.platformRole !== "platform_admin") {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  next();
}
