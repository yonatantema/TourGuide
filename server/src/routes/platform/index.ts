import { Router } from "express";
import settingsRouter from "./settings";
import seedArtworksRouter from "./seedArtworks";
import seedGuidesRouter from "./seedGuides";
import adminsRouter from "./admins";

// Aggregates all /api/platform/* sub-routes. Mounted in server/src/index.ts
// behind requireAuth + requirePlatformAdmin so every endpoint here is gated
// to TEMA Creative employees with platform_role = 'platform_admin'.
const router = Router();

router.use("/settings", settingsRouter);
router.use("/seed-artworks", seedArtworksRouter);
router.use("/seed-guides", seedGuidesRouter);
router.use("/admins", adminsRouter);

export default router;
