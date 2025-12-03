import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";

const router = Router();

router.get("/stats", analyticsController.getDashboardStats);
router.get("/trends", analyticsController.getValuationTrends);
router.get("/performance", analyticsController.getAppraiserPerformance);

export const analyticsRoutes = router;
