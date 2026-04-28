import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import pool from "./db";
import { requireAuth } from "./middleware/auth";
import { requirePlatformAdmin } from "./middleware/platformAdmin";
import authRoutes from "./routes/auth";
import artworkRoutes from "./routes/artworks";
import guideRoutes from "./routes/guides";
import recognizeRoutes from "./routes/recognize";
import conversationRoutes from "./routes/conversation";
import usageRoutes from "./routes/usage";
import platformRoutes from "./routes/platform";

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Serve uploaded images statically
app.use("/uploads", express.static(uploadsDir));

// Public routes (no auth)
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/artworks", requireAuth, artworkRoutes);
app.use("/api/guides", requireAuth, guideRoutes);
app.use("/api/recognize", requireAuth, recognizeRoutes);
app.use("/api/conversation", requireAuth, conversationRoutes);
app.use("/api/usage", requireAuth, usageRoutes);
app.use("/api/platform", requireAuth, requirePlatformAdmin, platformRoutes);

// Initialize database table and start server
const initSQL = fs.readFileSync(path.join(__dirname, "db/init.sql"), "utf-8");
pool.query(initSQL).then(() => {
  console.log("Database initialized");
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
