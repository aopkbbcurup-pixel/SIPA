import mongoose from "mongoose";
import {
    AppSettings,
    Report,
    ReportStatus,
    ReportQuery,
    User,
    UserRole,
} from "../types/domain";
import { IDatabase } from "./database";
import {
    UserModel,
    ReportModel,
    AppSettingsModel,
    CountersModel,
} from "./models";
import { NotFoundError, ValidationError } from "../utils/errors";
import { env } from "../config/env";

export class MongoDatabase implements IDatabase {
    private isConnected = false;

    async init() {
        if (this.isConnected) return;

        try {
            const mongoUri = env.mongoUri || "mongodb://localhost:27017/sipa";
            await mongoose.connect(mongoUri);
            this.isConnected = true;
            console.log("Connected to MongoDB");

            // Initialize default settings if not exists
            const settings = await AppSettingsModel.findOne();
            if (!settings) {
                await AppSettingsModel.create({
                    valuation: {
                        safetyMarginOptions: [0, 5, 10, 15, 20],
                        defaultSafetyMargin: 10,
                        liquidationFactorOptions: [40, 50, 60, 70, 80],
                        defaultLiquidationFactor: 60,
                    },
                    checklist: {
                        requiredAttachments: [
                            "photo_front",
                            "photo_right",
                            "photo_left",
                            "photo_interior",
                            "map",
                            "legal_doc",
                        ],
                        requiredLegalDocumentTypes: ["SHM", "IMB"],
                        requireComparablesCount: 2,
                        allowWarningsForSubmission: true,
                    },
                });
            }

            // Initialize counters if not exists
            const counters = await CountersModel.findOne();
            if (!counters) {
                await CountersModel.create({ reportNumber: 1000 });
            }

        } catch (error) {
            console.error("MongoDB connection error:", error);
            throw new Error("Failed to connect to MongoDB");
        }
    }

    async getUsers(): Promise<User[]> {
        const users = await UserModel.find();
        return users.map(u => u.toObject());
    }

    async addUser(user: User) {
        const exists = await UserModel.findOne({ username: user.username });
        if (exists) {
            throw new ValidationError("Username already exists");
        }
        await UserModel.create(user);
    }

    async updateUser(userId: string, updates: Partial<Omit<User, "id" | "createdAt">>) {
        const user = await UserModel.findOne({ id: userId });
        if (!user) {
            throw new NotFoundError("Pengguna tidak ditemukan.");
        }
        Object.assign(user, updates, { updatedAt: new Date().toISOString() });
        await user.save();
    }

    async deleteUser(userId: string) {
        const result = await UserModel.deleteOne({ id: userId });
        if (result.deletedCount === 0) {
            throw new NotFoundError("Pengguna tidak ditemukan.");
        }
    }

    async getReports(query: ReportQuery = {}): Promise<Report[]> {
        const filter: mongoose.FilterQuery<Report> = {};

        if (query.search) {
            const searchRegex = new RegExp(query.search, "i");
            filter.$or = [
                { "generalInfo.customerName": searchRegex },
                { "generalInfo.reportNumber": searchRegex },
                { title: searchRegex },
            ];
        }

        if (query.status) {
            filter.status = query.status;
        }

        if (query.from || query.to) {
            filter.createdAt = {};
            if (query.from) {
                filter.createdAt.$gte = new Date(query.from).toISOString();
            }
            if (query.to) {
                filter.createdAt.$lte = new Date(query.to).toISOString();
            }
        }

        const queryBuilder = ReportModel.find(filter).sort({ createdAt: -1 });

        if (query.limit) {
            queryBuilder.limit(query.limit);
        }

        const reports = await queryBuilder;
        return reports.map(r => r.toObject());
    }

    async getReportById(reportId: string): Promise<Report | undefined> {
        const report = await ReportModel.findOne({ id: reportId });
        return report ? report.toObject() : undefined;
    }

    async addReport(report: Report) {
        await ReportModel.create(report);
    }

    async updateReport(reportId: string, updates: Partial<Report>) {
        const report = await ReportModel.findOne({ id: reportId });
        if (!report) {
            throw new NotFoundError("Laporan tidak ditemukan.");
        }
        Object.assign(report, updates, { updatedAt: new Date().toISOString() });
        await report.save();
    }

    async deleteReport(reportId: string) {
        await ReportModel.deleteOne({ id: reportId });
    }

    async updateReportStatus(reportId: string, status: ReportStatus, metadata: Partial<Report>) {
        const report = await ReportModel.findOne({ id: reportId });
        if (!report) {
            throw new NotFoundError("Laporan tidak ditemukan.");
        }
        const now = new Date().toISOString();
        report.status = status;
        if (status === "for_review") {
            report.submittedAt = now;
        }
        if (status === "approved") {
            report.approvedAt = now;
        }
        if (status === "rejected") {
            report.rejectedAt = now;
        } else {
            report.rejectedAt = undefined as any;
            report.rejectionReason = undefined as any;
        }
        Object.assign(report, metadata, { updatedAt: now });
        await report.save();
    }

    async getNextReportNumber(): Promise<number> {
        const counter = await CountersModel.findOneAndUpdate(
            {},
            { $inc: { reportNumber: 1 } },
            { new: true, upsert: true }
        );
        return counter.reportNumber;
    }

    async saveCounters() {
        // No-op for Mongo as we update atomically
    }

    async getUsersByRole(role: UserRole): Promise<User[]> {
        const users = await UserModel.find({ role });
        return users.map(u => u.toObject());
    }

    async findUserByUsername(username: string): Promise<User | undefined> {
        const user = await UserModel.findOne({ username });
        return user ? user.toObject() : undefined;
    }

    async getSettings(): Promise<AppSettings> {
        const settings = await AppSettingsModel.findOne();
        if (!settings) throw new Error("Settings not initialized");
        return settings.toObject();
    }

    async updateSettings(updates: Partial<AppSettings>) {
        const settings = await AppSettingsModel.findOne();
        if (!settings) return;

        const current = settings.toObject() as AppSettings;
        const merged: AppSettings = {
            valuation: {
                ...current.valuation,
                ...updates.valuation,
                safetyMarginOptions:
                    updates.valuation?.safetyMarginOptions && updates.valuation.safetyMarginOptions.length
                        ? updates.valuation.safetyMarginOptions
                        : current.valuation.safetyMarginOptions,
                liquidationFactorOptions:
                    updates.valuation?.liquidationFactorOptions &&
                        updates.valuation.liquidationFactorOptions.length
                        ? updates.valuation.liquidationFactorOptions
                        : current.valuation.liquidationFactorOptions,
            },
            checklist: {
                ...current.checklist,
                ...updates.checklist,
                requiredAttachments:
                    updates.checklist?.requiredAttachments && updates.checklist.requiredAttachments.length
                        ? updates.checklist.requiredAttachments
                        : current.checklist.requiredAttachments,
                requiredLegalDocumentTypes:
                    updates.checklist?.requiredLegalDocumentTypes &&
                        updates.checklist.requiredLegalDocumentTypes.length
                        ? updates.checklist.requiredLegalDocumentTypes
                        : current.checklist.requiredLegalDocumentTypes,
            },
        };

        await AppSettingsModel.updateOne({}, merged);
    }
}
