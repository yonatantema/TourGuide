import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import pool from "./db";
import artworkRoutes from "./routes/artworks";

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(uploadsDir));

// API routes
app.use("/api/artworks", artworkRoutes);

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
