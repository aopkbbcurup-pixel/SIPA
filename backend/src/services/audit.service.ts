import type { Report, ReportStatus } from "../types/domain";

/**
 * Audit Trail Service
 * 
 * Tracks all changes to reports including status changes,
 * field updates, and user actions for compliance and transparency.
 */

export interface AuditEntry {
    timestamp: string;
    userId: string;
    userName: string;
    action: AuditAction;
    details: AuditDetails;
    previousValue?: unknown;
    newValue?: unknown;
}

export type AuditAction =
    | 'report_created'
    | 'report_updated'
    | 'status_changed'
    | 'report_submitted'
    | 'report_approved'
    | 'report_rejected'
    | 'report_deleted'
    | 'signature_added'
    | 'signature_removed'
    | 'document_uploaded'
    | 'document_deleted';

export interface AuditDetails {
    reportId: string;
    reportNumber?: string;
    statusFrom?: ReportStatus;
    statusTo?: ReportStatus;
    reason?: string;
    fieldChanged?: string;
    additionalInfo?: Record<string, unknown>;
}

/**
 * Create audit entry for report creation
 */
export function createAuditEntry(
    userId: string,
    userName: string,
    action: AuditAction,
    details: AuditDetails,
    previousValue?: unknown,
    newValue?: unknown
): AuditEntry {
    return {
        timestamp: new Date().toISOString(),
        userId,
        userName,
        action,
        details,
        previousValue,
        newValue,
    };
}

/**
 * Get audit trail summary for display
 */
export function getAuditSummary(report: Report): {
    createdBy: string;
    createdAt: string;
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    statusHistory: Array<{
        status: ReportStatus;
        changedBy: string;
        changedAt: string;
        reason?: string;
    }>;
} {
    const auditTrail = report.auditTrail || [];

    const statusChanges = auditTrail.filter(
        entry => entry.action === 'status_changed' ||
            entry.action === 'report_submitted' ||
            entry.action === 'report_approved' ||
            entry.action === 'report_rejected'
    );

    const statusHistory = statusChanges.map(entry => ({
        status: (entry.details.statusTo || report.status) as ReportStatus,
        changedBy: entry.userName,
        changedAt: entry.timestamp,
        reason: entry.details.reason,
    }));

    const lastUpdate = auditTrail[auditTrail.length - 1];

    return {
        createdBy: report.createdBy || 'System',
        createdAt: report.createdAt,
        lastModifiedBy: lastUpdate?.userName,
        lastModifiedAt: lastUpdate?.timestamp,
        statusHistory,
    };
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditEntry): string {
    const date = new Date(entry.timestamp).toLocaleString('id-ID');

    switch (entry.action) {
        case 'report_created':
            return `${date} - ${entry.userName} membuat laporan`;

        case 'report_updated':
            return `${date} - ${entry.userName} memperbarui laporan`;

        case 'status_changed':
            return `${date} - ${entry.userName} mengubah status dari ${entry.details.statusFrom} ke ${entry.details.statusTo}`;

        case 'report_submitted':
            return `${date} - ${entry.userName} mengirim laporan untuk review`;

        case 'report_approved':
            return `${date} - ${entry.userName} menyetujui laporan`;

        case 'report_rejected':
            const reason = entry.details.reason ? ` (Alasan: ${entry.details.reason})` : '';
            return `${date} - ${entry.userName} menolak laporan${reason}`;

        case 'signature_added':
            return `${date} - ${entry.userName} menambahkan tanda tangan`;

        case 'signature_removed':
            return `${date} - ${entry.userName} menghapus tanda tangan`;

        default:
            return `${date} - ${entry.userName} melakukan ${entry.action}`;
    }
}
