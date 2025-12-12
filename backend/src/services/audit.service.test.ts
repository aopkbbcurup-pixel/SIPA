import { describe, it, expect } from 'vitest';
import { createAuditEntry, getAuditSummary, formatAuditEntry } from './audit.service';
import type { Report } from '../types/domain';

describe('Audit Service', () => {
    describe('createAuditEntry', () => {
        it('should create audit entry with all fields', () => {
            const entry = createAuditEntry(
                'user-123',
                'John Doe',
                'report_created',
                { reportId: 'report-456', reportNumber: 'SIPA-2024-001' }
            );

            expect(entry.userId).toBe('user-123');
            expect(entry.userName).toBe('John Doe');
            expect(entry.action).toBe('report_created');
            expect(entry.details.reportId).toBe('report-456');
            expect(entry.timestamp).toBeDefined();
        });

        it('should include previous and new values', () => {
            const entry = createAuditEntry(
                'user-123',
                'John Doe',
                'status_changed',
                {
                    reportId: 'report-456',
                    statusFrom: 'draft',
                    statusTo: 'for_review'
                },
                'draft',
                'for_review'
            );

            expect(entry.previousValue).toBe('draft');
            expect(entry.newValue).toBe('for_review');
        });
    });

    describe('formatAuditEntry', () => {
        it('should format report creation', () => {
            const entry = createAuditEntry(
                'user-123',
                'John Doe',
                'report_created',
                { reportId: 'report-456' }
            );

            const formatted = formatAuditEntry(entry);
            expect(formatted).toContain('John Doe');
            expect(formatted).toContain('membuat laporan');
        });

        it('should format status change', () => {
            const entry = createAuditEntry(
                'user-123',
                'Jane Smith',
                'status_changed',
                {
                    reportId: 'report-456',
                    statusFrom: 'draft',
                    statusTo: 'for_review'
                }
            );

            const formatted = formatAuditEntry(entry);
            expect(formatted).toContain('Jane Smith');
            expect(formatted).toContain('draft');
            expect(formatted).toContain('for_review');
        });

        it('should format rejection with reason', () => {
            const entry = createAuditEntry(
                'user-123',
                'Supervisor',
                'report_rejected',
                {
                    reportId: 'report-456',
                    reason: 'Data tidak lengkap'
                }
            );

            const formatted = formatAuditEntry(entry);
            expect(formatted).toContain('menolak laporan');
            expect(formatted).toContain('Data tidak lengkap');
        });
    });

    describe('getAuditSummary', () => {
        it('should extract status history', () => {
            const report: Partial<Report> = {
                id: 'report-456',
                status: 'approved',
                createdBy: 'User 1',
                createdAt: '2024-01-01T00:00:00Z',
                auditTrail: [
                    createAuditEntry('user-1', 'User 1', 'report_created', { reportId: 'report-456' }),
                    createAuditEntry('user-1', 'User 1', 'status_changed', {
                        reportId: 'report-456',
                        statusFrom: 'draft',
                        statusTo: 'for_review'
                    }),
                    createAuditEntry('user-2', 'Supervisor', 'report_approved', {
                        reportId: 'report-456',
                        statusTo: 'approved'
                    }),
                ],
            };

            const summary = getAuditSummary(report as Report);

            expect(summary.createdBy).toBe('User 1');
            expect(summary.statusHistory).toHaveLength(3);
            expect(summary.statusHistory[0].changedBy).toBe('User 1');
            expect(summary.statusHistory[2].status).toBe('approved');
            expect(summary.lastModifiedBy).toBe('Supervisor');
        });

        it('should handle report without audit trail', () => {
            const report: Partial<Report> = {
                id: 'report-456',
                status: 'draft',
                createdBy: 'User 1',
                createdAt: '2024-01-01T00:00:00Z',
                auditTrail: [],
            };

            const summary = getAuditSummary(report as Report);

            expect(summary.createdBy).toBe('User 1');
            expect(summary.statusHistory).toHaveLength(0);
            expect(summary.lastModifiedBy).toBeUndefined();
        });
    });
});
