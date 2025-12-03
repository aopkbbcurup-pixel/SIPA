import { Router } from "express";
import authRoutes from "./auth.routes";
import reportRoutes from "./report.routes";
import userRoutes from "./user.routes";
import { aiRoutes } from "./ai.routes";
import { metadataController, updateSettingsController } from "../controllers/meta.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { settingsUpdateSchema } from "../types/settings.dto";
import { analyticsRoutes } from "./analytics.routes";
import { gisRoutes } from "./gis.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/reports", reportRoutes);
router.use("/users", userRoutes);
router.use("/ai", aiRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/gis", gisRoutes);
router.get("/meta", metadataController);
router.patch(
  "/meta/settings",
  authenticate(["admin"]),
  validateBody(settingsUpdateSchema),
  updateSettingsController,
);

export default router;
