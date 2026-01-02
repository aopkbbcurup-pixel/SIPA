import ExcelJS from 'exceljs';
import type { Report } from '../types/domain';

/**
 * Export Service
 * 
 * Provides functionality to export reports and analytics data
 * to various formats (Excel, CSV) for analysis and archival.
 */

/**
 * Export reports to Excel format
 */
export async function exportReportsToExcel(reports: Report[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penilaian');

    // Define columns
    worksheet.columns = [
        { header: 'No. Laporan', key: 'reportNumber', width: 20 },
        { header: 'Tanggal', key: 'reportDate', width: 15 },
        { header: 'Nama Debitur', key: 'customerName', width: 30 },
        { header: 'Alamat Agunan', key: 'address', width: 40 },
        { header: 'Luas Tanah (m²)', key: 'landArea', width: 15 },
        { header: 'Luas Bangunan (m²)', key: 'buildingArea', width: 15 },
        { header: 'Nilai Pasar (Rp)', key: 'marketValue', width: 20 },
        { header: 'Nilai Likuidasi (Rp)', key: 'liquidationValue', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Penilai', key: 'appraiser', width: 25 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    reports.forEach((report) => {
        worksheet.addRow({
            reportNumber: report.generalInfo.reportNumber,
            reportDate: report.generalInfo.reportDate || '',
            customerName: report.generalInfo.customerName,
            address: report.collateral[0]?.address || '',
            landArea: report.valuationInput.landArea,
            buildingArea: report.valuationInput.buildingArea || 0,
            marketValue: report.valuationResult?.marketValue || 0,
            liquidationValue: report.valuationResult?.liquidationValue || 0,
            status: getStatusLabel(report.status),
            appraiser: report.assignedAppraiserId || '',
        });
    });

    // Format numbers
    worksheet.getColumn('landArea').numFmt = '#,##0.00';
    worksheet.getColumn('buildingArea').numFmt = '#,##0.00';
    worksheet.getColumn('marketValue').numFmt = '#,##0';
    worksheet.getColumn('liquidationValue').numFmt = '#,##0';

    // Auto-filter
    worksheet.autoFilter = {
        from: 'A1',
        to: 'J1',
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Export reports to CSV format
 */
export async function exportReportsToCSV(reports: Report[]): Promise<string> {
    const headers = [
        'No. Laporan',
        'Tanggal',
        'Nama Debitur',
        'Alamat Agunan',
        'Luas Tanah (m²)',
        'Luas Bangunan (m²)',
        'Nilai Pasar (Rp)',
        'Nilai Likuidasi (Rp)',
        'Status',
        'Penilai',
    ];

    const rows = reports.map((report) => [
        report.generalInfo.reportNumber,
        report.generalInfo.reportDate || '',
        report.generalInfo.customerName,
        report.collateral[0]?.address || '',
        report.valuationInput.landArea,
        report.valuationInput.buildingArea || 0,
        report.valuationResult?.marketValue || 0,
        report.valuationResult?.liquidationValue || 0,
        getStatusLabel(report.status),
        report.assignedAppraiserId || '',
    ]);

    // Build CSV
    const csvLines = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];

    return csvLines.join('\n');
}

/**
 * Export analytics summary to CSV
 */
export async function exportAnalyticsToCSV(data: {
    totalReports: number;
    byStatus: Record<string, number>;
    byAppraiser: Record<string, number>;
    totalValue: number;
    averageValue: number;
}): Promise<string> {
    const lines = [
        'SIPA Analytics Summary',
        '',
        'Metric,Value',
        `Total Reports,${data.totalReports}`,
        `Total Market Value,${data.totalValue}`,
        `Average Market Value,${data.averageValue}`,
        '',
        'Reports by Status',
        'Status,Count',
        ...Object.entries(data.byStatus).map(([status, count]) =>
            `${getStatusLabel(status)},${count}`
        ),
        '',
        'Reports by Appraiser',
        'Appraiser,Count',
        ...Object.entries(data.byAppraiser).map(([appraiser, count]) =>
            `${appraiser},${count}`
        ),
    ];

    return lines.join('\n');
}

/**
 * Get Indonesian status label
 */
function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        'draft': 'Draft',
        'for_review': 'Menunggu Review',
        'approved': 'Disetujui',
        'rejected': 'Ditolak',
    };
    return labels[status] || status;
}
