import { Request, Response } from "express";
import { aiService } from "../services/ai.service";
import { Report } from "../types/domain";

export class AiController {
    async generateRemarks(req: Request, res: Response) {
        try {
            const reportData: Partial<Report> = req.body;
            const remarks = await aiService.generateReportRemarks(reportData);
            res.json({ remarks });
        } catch (error) {
            console.error("AI Generation Error:", error);
            res.status(500).json({ error: "Failed to generate remarks" });
        }
    }

    async predictPrice(req: Request, res: Response) {
        try {
            const reportData: Partial<Report> = req.body;
            const prediction = await aiService.predictPropertyPrice(reportData);
            res.json(prediction);
        } catch (error) {
            console.error("AI Prediction Error:", error);
            res.status(500).json({ error: "Failed to predict price" });
        }
    }

    async chat(req: Request, res: Response) {
        try {
            const { query } = req.body;
            // In a real app, we would use a vector DB. Here we fetch recent reports as context.
            // We'll use the existing database service to get reports.
            // Note: This requires importing 'db' from store/database
            const { db } = require("../store/database");
            const reports = await db.getReports({ limit: 50 }); // Get last 50 reports as context

            const answer = await aiService.chatWithData(query, reports);
            res.json({ answer });
        } catch (error) {
            console.error("AI Chat Error:", error);
            res.status(500).json({ error: "Failed to process chat" });
        }
    }

    async extractDocument(req: Request, res: Response) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "No file uploaded" });
                return;
            }
            const data = await aiService.extractDocumentData(req.file);
            res.json(data);
        } catch (error) {
            console.error("OCR Error:", error);
            res.status(500).json({ error: "Failed to extract document data" });
        }
    }

    async analyzeImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "No file uploaded" });
                return;
            }
            const data = await aiService.analyzeImage(req.file);
            res.json(data);
        } catch (error) {
            console.error("CV Error:", error);
            res.status(500).json({ error: "Failed to analyze image" });
        }
    }
}

export const aiController = new AiController();
