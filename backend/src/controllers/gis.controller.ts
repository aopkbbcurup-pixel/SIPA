import { Request, Response } from "express";
import { gisService } from "../services/gis.service";

export class GisController {
    async getComparables(req: Request, res: Response) {
        try {
            const lat = parseFloat(req.query.lat as string) || -6.200000; // Default Jakarta
            const lng = parseFloat(req.query.lng as string) || 106.816666;
            const radius = parseFloat(req.query.radius as string) || 1;

            const comparables = await gisService.getNearbyComparables(lat, lng, radius);
            res.json(comparables);
        } catch (error) {
            console.error("GIS Error:", error);
            res.status(500).json({ error: "Failed to fetch comparable data" });
        }
    }
}

export const gisController = new GisController();
