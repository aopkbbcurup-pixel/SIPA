import fs from "fs-extra";
import path from "node:path";
import bcrypt from "bcryptjs";
import { DatabaseSchema, Report, ReportStatus, User, UserRole } from "../types/domain";
import { paths } from "../config/env";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_SALT_ROUNDS = 10;

async function createSeedData(): Promise<DatabaseSchema> {
  const password = await bcrypt.hash("password123", DEFAULT_SALT_ROUNDS);
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: uuidv4(),
        username: "appraiser",
        fullName: "Appraiser Utama",
        role: "appraiser",
        passwordHash: password,
        unit: "Kantor Cabang Jakarta",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        username: "supervisor",
        fullName: "Supervisor Penilaian",
        role: "supervisor",
        passwordHash: password,
        unit: "Divisi Penilaian",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
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
  };
}

export class Database {
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
      this.data = await fs.readJSON(paths.dataFile);
    }
  }

  private ensureReady() {
    if (!this.data) {
      throw new Error("Database not initialised");
    }
  }

  private async persist() {
    this.ensureReady();
    await fs.writeJSON(paths.dataFile, this.data, { spaces: 2 });
  }

  getUsers(): User[] {
    this.ensureReady();
    return this.data!.users;
  }

  async addUser(user: User) {
    this.ensureReady();
    this.data!.users.push(user);
    await this.persist();
  }

  async updateUser(userId: string, updates: Partial<Omit<User, "id" | "createdAt">>) {
    this.ensureReady();
    const user = this.data!.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    await this.persist();
  }

  async deleteUser(userId: string) {
    this.ensureReady();
    const initialLength = this.data!.users.length;
    this.data!.users = this.data!.users.filter((user) => user.id !== userId);
    if (this.data!.users.length === initialLength) {
      throw new Error("User not found");
    }
    await this.persist();
  }

  getReports(): Report[] {
    this.ensureReady();
    const reports = [...this.data!.reports];
    return reports.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
  }

  getReportById(reportId: string) {
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
      throw new Error("Report not found");
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
      throw new Error("Report not found");
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

  getNextReportNumber() {
    this.ensureReady();
    const current = this.data!.counters.reportNumber + 1;
    this.data!.counters.reportNumber = current;
    return current;
  }

  async saveCounters() {
    await this.persist();
  }

  getUsersByRole(role: UserRole) {
    this.ensureReady();
    return this.data!.users.filter((u) => u.role === role);
  }

  findUserByUsername(username: string) {
    this.ensureReady();
    return this.data!.users.find((u) => u.username === username);
  }
}

export const db = new Database();
