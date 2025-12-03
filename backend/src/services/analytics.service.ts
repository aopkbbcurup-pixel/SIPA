import { db } from "../store/database";
import { Report } from "../types/domain";

export class AnalyticsService {
    async getDashboardStats() {
        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        const reports = await db.getReports({ limit: 1000 });

        const totalReports = reports.length;
        const completedReports = reports.filter(r => r.status === "approved" || r.status === "rejected").length;
        const pendingReports = totalReports - completedReports;

        // Calculate average Turn Around Time (TAT) for completed reports
        // Mocking TAT calculation as difference between createdAt and approvedAt/rejectedAt
        let totalTatHours = 0;
        let tatCount = 0;

        reports.forEach(r => {
            if (r.status === "approved" && r.approvedAt) {
                const start = new Date(r.createdAt).getTime();
                const end = new Date(r.approvedAt).getTime();
                totalTatHours += (end - start) / (1000 * 60 * 60);
                tatCount++;
            }
        });

        const avgTat = tatCount > 0 ? Math.round(totalTatHours / tatCount) : 0;

        return {
            totalReports,
            completedReports,
            pendingReports,
            avgTatHours: avgTat,
            activeAppraisers: 5 // Mock constant for now
        };
    }

    async getValuationTrends() {
        // Mock data for chart
        return [
            { month: "Jan", avgValue: 1.2, count: 12 },
            { month: "Feb", avgValue: 1.5, count: 15 },
            { month: "Mar", avgValue: 1.1, count: 10 },
            { month: "Apr", avgValue: 1.8, count: 20 },
            { month: "May", avgValue: 2.1, count: 25 },
            { month: "Jun", avgValue: 1.9, count: 22 },
        ];
    }

    async getAppraiserPerformance() {
        // Mock data
        return [
            { name: "Budi Santoso", reports: 15, avgTat: 24, rating: 4.8 },
            { name: "Siti Aminah", reports: 12, avgTat: 28, rating: 4.5 },
            { name: "Andi Wijaya", reports: 20, avgTat: 20, rating: 4.9 },
        ];
    }
}

export const analyticsService = new AnalyticsService();
