import fs from "fs-extra";
import path from "node:path";
import bcrypt from "bcryptjs";
import {
  AppSettings,
  DatabaseSchema,
  Report,
  ReportStatus,
  ReportQuery,
  User,
  UserRole,
  AttachmentCategory,
  WorkflowLock,
} from "../types/domain";
import { paths } from "../config/env";
import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "../utils/errors";

const DEFAULT_SALT_ROUNDS = 10;

function createDefaultSettings(): AppSettings {
  return {
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
      ] as AttachmentCategory[],
      requiredLegalDocumentTypes: ["SHM", "IMB"],
      requireComparablesCount: 2,
      allowWarningsForSubmission: true,
    },
  };
}

async function createSeedData(): Promise<DatabaseSchema> {
  const password = await bcrypt.hash("password123", DEFAULT_SALT_ROUNDS);
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: randomUUID(),
        username: "appraiser",
        fullName: "Appraiser Utama",
        role: "appraiser",
        passwordHash: password,
        unit: "Kantor Cabang Jakarta",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        username: "supervisor",
        fullName: "Supervisor Penilaian",
        role: "supervisor",
        passwordHash: password,
        unit: "Divisi Penilaian",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        username: "admin",
        fullName: "Administrator SIPA",
        role: "admin",
        passwordHash: password,
        unit: "Kantor Pusat",
        createdAt: now,
        updatedAt: now,
      },
    ],
    reports: [],
    counters: {
      reportNumber: 1000,
    },
    settings: createDefaultSettings(),
  };
}

export interface IDatabase {
  init(): Promise<void>;
  getUsers(): Promise<User[]>;
  addUser(user: User): Promise<void>;
  updateUser(userId: string, updates: Partial<Omit<User, "id" | "createdAt">>): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getReports(query?: ReportQuery): Promise<Report[]>;
  getReportById(reportId: string): Promise<Report | undefined>;
  addReport(report: Report): Promise<void>;
  updateReport(reportId: string, updates: Partial<Report>): Promise<void>;
  deleteReport(reportId: string): Promise<void>;
  updateReportStatus(reportId: string, status: ReportStatus, metadata: Partial<Report>): Promise<void>;
  getNextReportNumber(): Promise<number>;
  saveCounters(): Promise<void>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  findUserByUsername(username: string): Promise<User | undefined>;
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>): Promise<void>;
}

export class JSONDatabase implements IDatabase {
  private data: DatabaseSchema | null = null;

  async init() {
    const dir = path.dirname(paths.dataFile);
    await fs.ensureDir(dir);
    const exists = await fs.pathExists(paths.dataFile);
    if (!exists) {
      const seed = await createSeedData();
      await fs.writeJSON(paths.dataFile, seed, { spaces: 2 });
      this.data = seed;
    } else {
      try {
        const rawData = (await fs.readJSON(paths.dataFile)) as DatabaseSchema;
        this.data = this.migrateData(rawData);
      } catch (error) {
        console.error("Failed to read database file:", error);
        throw new Error("Database initialization failed");
      }
    }
  }

  private migrateData(rawData: DatabaseSchema): DatabaseSchema {
    // Ensure settings exist and merge with defaults for new properties
    if (!rawData.settings) {
      rawData.settings = createDefaultSettings();
    } else {
      rawData.settings = {
        ...createDefaultSettings(), // Start with all defaults
        ...rawData.settings, // Overlay existing settings
        valuation: {
          ...createDefaultSettings().valuation,
          ...rawData.settings.valuation,
          // Specific array merging logic if needed, otherwise spread handles it
          safetyMarginOptions:
            rawData.settings.valuation?.safetyMarginOptions?.length
              ? rawData.settings.valuation.safetyMarginOptions
              : createDefaultSettings().valuation.safetyMarginOptions,
          liquidationFactorOptions:
            rawData.settings.valuation?.liquidationFactorOptions?.length
              ? rawData.settings.valuation.liquidationFactorOptions
              : createDefaultSettings().valuation.liquidationFactorOptions,
        },
        checklist: {
          ...createDefaultSettings().checklist,
          ...rawData.settings.checklist,
          // Specific array merging logic if needed
          requiredAttachments:
            rawData.settings.checklist?.requiredAttachments?.length
              ? rawData.settings.checklist.requiredAttachments
              : createDefaultSettings().checklist.requiredAttachments,
        },
      };
    }

    // Migrate reports
    rawData.reports = rawData.reports.map((report) => {
      const upgraded: Report = {
        ...(report as Report),
        attachments: report.attachments ?? [],
        qualityChecks: report.qualityChecks ?? [],
        qualitySummary:
          report.qualitySummary ?? {
            total: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
          },
        auditTrail: report.auditTrail ?? [],
        signatures: report.signatures ?? {},
        legalAlerts: report.legalAlerts ?? [],
      };

      if (!upgraded.comparableAnalysis && report.valuationResult?.comparablesAnalysis) {
        upgraded.comparableAnalysis = report.valuationResult.comparablesAnalysis;
      }

      if (!upgraded.workflowLock) {
        if (report.status === "approved") {
          const lock: WorkflowLock = {
            locked: true,
            reason: "Laporan dikunci otomatis karena status disetujui sebelum pembaruan sistem.",
          };
          if (report.approvedAt) {
            lock.lockedAt = report.approvedAt;
          }
          upgraded.workflowLock = lock;
        } else {
          upgraded.workflowLock = { locked: false };
        }
      }

      return upgraded;
    });

    return rawData;
  }

  private ensureReady() {
    if (!this.data) {
      throw new Error("Database not initialised");
    }
  }

  private async persist() {
    this.ensureReady();
    try {
      await fs.writeJSON(paths.dataFile, this.data, { spaces: 2 });
    } catch (error) {
      console.error("Failed to persist database:", error);
      throw new Error("Database persistence failed");
    }
  }

  async getUsers(): Promise<User[]> {
    this.ensureReady();
    return this.data!.users;
  }

  async addUser(user: User) {
    this.ensureReady();
    if (this.data!.users.some(u => u.username === user.username)) {
      throw new ValidationError("Username already exists");
    }
    this.data!.users.push(user);
    await this.persist();
  }

  async updateUser(userId: string, updates: Partial<Omit<User, "id" | "createdAt">>) {
    this.ensureReady();
    const user = this.data!.users.find((u) => u.id === userId);
    if (!user) {
      throw new NotFoundError("Pengguna tidak ditemukan.");
    }
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    await this.persist();
  }

  async deleteUser(userId: string) {
    this.ensureReady();
    const initialLength = this.data!.users.length;
    this.data!.users = this.data!.users.filter((user) => user.id !== userId);
    if (this.data!.users.length === initialLength) {
      throw new NotFoundError("Pengguna tidak ditemukan.");
    }
    await this.persist();
  }

  async getReports(query: ReportQuery = {}): Promise<Report[]> {
    this.ensureReady();
    let reports = [...this.data!.reports];

    // Filter by search term
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      reports = reports.filter((report) =>
        [report.generalInfo.customerName, report.generalInfo.reportNumber, report.title]
          .join(" ")
          .toLowerCase()
          .includes(searchLower)
      );
    }

    // Filter by status
    if (query.status) {
      reports = reports.filter((report) => report.status === query.status);
    }

    // Filter by date range
    if (query.from) {
      const fromDate = new Date(query.from).valueOf();
      reports = reports.filter((report) => new Date(report.createdAt).valueOf() >= fromDate);
    }
    if (query.to) {
      const toDate = new Date(query.to).valueOf();
      reports = reports.filter((report) => new Date(report.createdAt).valueOf() <= toDate);
    }

    reports.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());

    if (query.limit) {
      reports = reports.slice(0, query.limit);
    }

    return reports;
  }

  async getReportById(reportId: string): Promise<Report | undefined> {
    this.ensureReady();
    return this.data!.reports.find((r) => r.id === reportId);
  }

  async addReport(report: Report) {
    this.ensureReady();
    this.data!.reports.push(report);
    await this.persist();
  }

  async updateReport(reportId: string, updates: Partial<Report>) {
    this.ensureReady();
    const report = this.data!.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new NotFoundError("Laporan tidak ditemukan.");
    }
    Object.assign(report, updates, { updatedAt: new Date().toISOString() });
    await this.persist();
  }

  async deleteReport(reportId: string) {
    this.ensureReady();
    this.data!.reports = this.data!.reports.filter((r) => r.id !== reportId);
    await this.persist();
  }

  async updateReportStatus(reportId: string, status: ReportStatus, metadata: Partial<Report>) {
    this.ensureReady();
    const report = this.data!.reports.find((r) => r.id === reportId);
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
      delete report.rejectedAt;
      delete report.rejectionReason;
    }
    Object.assign(report, metadata, { updatedAt: now });
    await this.persist();
  }

  async getNextReportNumber(): Promise<number> {
    this.ensureReady();
    const current = this.data!.counters.reportNumber + 1;
    this.data!.counters.reportNumber = current;
    return current;
  }

  async saveCounters() {
    await this.persist();
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    this.ensureReady();
    return this.data!.users.filter((u) => u.role === role);
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    this.ensureReady();
    return this.data!.users.find((u) => u.username === username);
  }

  async getSettings(): Promise<AppSettings> {
    this.ensureReady();
    return this.data!.settings;
  }

  async updateSettings(updates: Partial<AppSettings>) {
    this.ensureReady();
    const current = this.data!.settings;
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
    this.data!.settings = merged;
    await this.persist();
  }
}

import { MongoDatabase } from "./mongo-database";
import { FirestoreDatabase } from "./firestore-database";
import { env } from "../config/env";

export const db: IDatabase =
  env.databaseType === "mongo" ? new MongoDatabase() :
    env.databaseType === "firestore" ? new FirestoreDatabase() :
      new JSONDatabase();
