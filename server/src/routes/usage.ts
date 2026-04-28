import { Router, Request, Response } from "express";
import { getAllUsage, isUnlimitedUser, getAllLimits } from "../services/usageLimits";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    if (isUnlimitedUser(req.user!.email)) {
      return res.json({ unlimited: true });
    }
    const [usage, limits] = await Promise.all([
      getAllUsage(req.user!.id),
      getAllLimits(),
    ]);
    res.json({
      artwork_creation: { used: usage.artwork_creation, limit: limits.artwork_creation },
      image_recognition: { used: usage.image_recognition, limit: limits.image_recognition },
      conversation_seconds: { used: usage.conversation_seconds, limit: limits.conversation_seconds },
    });
  } catch (err) {
    console.error("Usage fetch error:", err);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;
