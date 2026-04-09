import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import pool from "../db";
import { seedOrgData } from "../services/seed";

const router = Router();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

function signToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

// GET /api/auth/google/url — return the Google OAuth consent URL
router.get("/google/url", (_req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
  res.json({ url });
});

// POST /api/auth/google/callback — exchange code for tokens, upsert user
router.post("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const { tokens } = await oauth2Client.getToken(code);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const googleId = payload.sub;
    const email = payload.email!;
    const name = payload.name || email;
    const picture = payload.picture || null;

    // Upsert user
    const userResult = await pool.query(
      `INSERT INTO users (google_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET email = $2, name = $3, picture = $4
       RETURNING *`,
      [googleId, email, name, picture]
    );
    const user = userResult.rows[0];

    // Check if user has an org
    const orgResult = await pool.query(
      "SELECT org_id FROM org_members WHERE user_id = $1 LIMIT 1",
      [user.id]
    );
    const needsSetup = orgResult.rows.length === 0;

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      needsSetup,
    });
  } catch (err) {
    console.error("Google auth callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// GET /api/auth/me — return current user info
router.get("/me", async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      name: string;
    };

    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      payload.sub,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }
    const user = userResult.rows[0];

    const orgResult = await pool.query(
      "SELECT o.id, o.name, o.is_personal FROM organizations o JOIN org_members om ON o.id = om.org_id WHERE om.user_id = $1 LIMIT 1",
      [user.id]
    );
    const org = orgResult.rows[0] || null;
    const needsSetup = !org;

    res.json({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      org,
      needsSetup,
    });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// POST /api/auth/setup — create personal org for new user
router.post("/setup", async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    const userId = payload.sub;

    // Check user doesn't already have an org
    const existingOrg = await pool.query(
      "SELECT org_id FROM org_members WHERE user_id = $1",
      [userId]
    );
    if (existingOrg.rows.length > 0) {
      return res.status(400).json({ error: "Account already set up" });
    }

    const { orgName, seed } = req.body;
    const name = orgName || "My Museum";

    // Create org
    const orgResult = await pool.query(
      "INSERT INTO organizations (name, is_personal) VALUES ($1, true) RETURNING *",
      [name]
    );
    const org = orgResult.rows[0];

    // Add user as owner
    await pool.query(
      "INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')",
      [org.id, userId]
    );

    // Optionally seed data
    if (seed) {
      await seedOrgData(org.id);
    }

    res.json({ org: { id: org.id, name: org.name, is_personal: org.is_personal } });
  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ error: "Setup failed" });
  }
});

// POST /api/auth/logout — clear the cookie
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out" });
});

export default router;
