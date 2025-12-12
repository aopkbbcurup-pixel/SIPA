import { Request, Response } from 'express';
import { exportReportsToExcel, exportReportsToCSV, exportAnalyticsToCSV } from '../services/export.service';
import { db } from '../store/database';
import type { Report } from '../types/domain';

/**
 * Export reports to Excel
 */
export async function exportReportsExcel(req: Request, res: Response) {
    try {
        const { status, from, to } = req.query;

        // Fetch reports with filters
        const reports = await db.getAllReports({
            status: status as string,
            from: from as string,
            to: to as string,
        });

        // Generate Excel
        const buffer = await exportReportsToExcel(reports);

        // Send file
        const filename = `SIPA_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Export to Excel failed:', error);
        res.status(500).json({ error: 'Export gagal' });
    }
}

/**
 * Export reports to CSV
 */
export async function exportReportsCSV(req: Request, res: Response) {
    try {
        const { status, from, to } = req.query;

        // Fetch reports with filters
        const reports = await db.getAllReports({
            status: status as string,
            from: from as string,
            to: to as string,
        });

        // Generate CSV
        const csv = await exportReportsToCSV(reports);

        // Send file
        const filename = `SIPA_Reports_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv); // Add BOM for Excel compatibility
    } catch (error) {
        console.error('Export to CSV failed:', error);
        res.status(500).json({ error: 'Export gagal' });
    }
}

/**
 * Export analytics to CSV
 */
export async function exportAnalytics(req: Request, res: Response) {
    try {
        // Get analytics data
        const reports = await db.getAllReports({});

        const analytics = {
            totalReports: reports.length,
            byStatus: reports.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            byAppraiser: reports.reduce((acc, r) => {
                const appraiser = r.createdBy || 'Unknown';
                acc[appraiser] = (acc[appraiser] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            totalValue: reports.reduce((sum, r) => sum + (r.valuationResult?.marketValue || 0), 0),
            averageValue: reports.length > 0
                ? reports.reduce((sum, r) => sum + (r.valuationResult?.marketValue || 0), 0) / reports.length
                : 0,
        };

        // Generate CSV
        const csv = await exportAnalyticsToCSV(analytics);

        // Send file
        const filename = `SIPA_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export analytics failed:', error);
        res.status(500).json({ error: 'Export gagal' });
    }
}
