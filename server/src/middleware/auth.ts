import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      orgId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      name: string;
    };
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Resolve the user's org (for now, use their first/only org)
  pool
    .query("SELECT org_id FROM org_members WHERE user_id = $1 LIMIT 1", [
      req.user.id,
    ])
    .then((result) => {
      if (result.rows.length === 0) {
        // User exists but has no org yet (needs setup)
        return res
          .status(403)
          .json({ error: "Account setup required", code: "NEEDS_SETUP" });
      }
      req.orgId = result.rows[0].org_id;
      next();
    })
    .catch((err) => {
      console.error("Auth middleware error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
}
