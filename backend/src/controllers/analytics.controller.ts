import { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";

export class AnalyticsController {
    async getDashboardStats(req: Request, res: Response) {
        try {
            const stats = await analyticsService.getDashboardStats();
            res.json(stats);
        } catch (error) {
            console.error("Analytics Error:", error);
            res.status(500).json({ error: "Failed to fetch dashboard stats" });
        }
    }

    async getValuationTrends(req: Request, res: Response) {
        try {
            const trends = await analyticsService.getValuationTrends();
            res.json(trends);
        } catch (error) {
            console.error("Analytics Error:", error);
            res.status(500).json({ error: "Failed to fetch valuation trends" });
        }
    }

    async getAppraiserPerformance(req: Request, res: Response) {
        try {
            const performance = await analyticsService.getAppraiserPerformance();
            res.json(performance);
        } catch (error) {
            console.error("Analytics Error:", error);
            res.status(500).json({ error: "Failed to fetch appraiser performance" });
        }
    }
}

export const analyticsController = new AnalyticsController();
