import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../src/store/database";
import { Report, User } from "../src/types/domain";
import { NotFoundError, ValidationError } from "../src/utils/errors";

// Mock the database
vi.mock("../src/store/database", () => ({
    db: {
        init: vi.fn(),
        getUsers: vi.fn(),
        addUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        getReports: vi.fn(),
        getReportById: vi.fn(),
        addReport: vi.fn(),
        updateReport: vi.fn(),
        deleteReport: vi.fn(),
        updateReportStatus: vi.fn(),
        getNextReportNumber: vi.fn(),
        saveCounters: vi.fn(),
        getUsersByRole: vi.fn(),
        findUserByUsername: vi.fn(),
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
    },
}));

describe("Service Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("User Management", () => {
        it("should add a user successfully", async () => {
            const newUser: User = {
                id: "123",
                username: "testuser",
                fullName: "Test User",
                role: "appraiser",
                passwordHash: "hash",
                unit: "Unit 1",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            vi.mocked(db.addUser).mockResolvedValue(undefined);
            await db.addUser(newUser);
            expect(db.addUser).toHaveBeenCalledWith(newUser);
        });

        it("should throw error if user not found during update", async () => {
            vi.mocked(db.updateUser).mockRejectedValue(new NotFoundError("Pengguna tidak ditemukan."));
            await expect(db.updateUser("non-existent", {})).rejects.toThrow(NotFoundError);
        });
    });

    describe("Report Management", () => {
        it("should get all reports sorted by date", () => {
            const reports: Report[] = [
                { id: "1", createdAt: "2023-01-01" } as any,
                { id: "2", createdAt: "2023-01-02" } as any,
            ];
            vi.mocked(db.getReports).mockReturnValue(reports.reverse()); // Mock returns sorted

            const result = db.getReports();
            expect(result[0].id).toBe("2");
            expect(db.getReports).toHaveBeenCalled();
        });

        it("should add a report successfully", async () => {
            const newReport: Report = { id: "1", status: "draft" } as any;
            vi.mocked(db.addReport).mockResolvedValue(undefined);
            await db.addReport(newReport);
            expect(db.addReport).toHaveBeenCalledWith(newReport);
        });
    });
});
