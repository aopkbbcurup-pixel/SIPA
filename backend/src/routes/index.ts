import { Router } from "express";
import authRoutes from "./auth.routes";
import reportRoutes from "./report.routes";
import userRoutes from "./user.routes";
import { metadataController } from "../controllers/meta.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/reports", reportRoutes);
router.use("/users", userRoutes);
router.get("/meta", metadataController);

export default router;
