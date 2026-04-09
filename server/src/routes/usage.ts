import { Router, Request, Response } from "express";
import { getAllUsage, USAGE_LIMITS } from "../services/usageLimits";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const usage = await getAllUsage(req.user!.id);
    res.json({
      artwork_creation: { used: usage.artwork_creation, limit: USAGE_LIMITS.artwork_creation },
      image_recognition: { used: usage.image_recognition, limit: USAGE_LIMITS.image_recognition },
      conversation_seconds: { used: usage.conversation_seconds, limit: USAGE_LIMITS.conversation_seconds },
    });
  } catch (err) {
    console.error("Usage fetch error:", err);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;
