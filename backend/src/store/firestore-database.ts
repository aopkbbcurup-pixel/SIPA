import * as admin from "firebase-admin";
import {
    AppSettings,
    DatabaseSchema,
    Report,
    ReportQuery,
    ReportStatus,
    User,
    UserRole,
} from "../types/domain";
import { IDatabase } from "./database";
import { NotFoundError, ValidationError } from "../utils/errors";
import { randomUUID } from "node:crypto";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized with service account from env");
        } catch (error) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", error);
            admin.initializeApp();
        }
    } else {
        admin.initializeApp();
    }
}

export class FirestoreDatabase implements IDatabase {
    private db: admin.firestore.Firestore;

    constructor() {
        this.db = admin.firestore();
    }

    async init(): Promise<void> {
        // Firestore doesn't need explicit init, but we can verify connection or create collections if needed
        // For now, we'll assume it's ready
        console.log("Firestore initialized");
    }

    // --- Users ---

    async getUsers(): Promise<User[]> {
        const snapshot = await this.db.collection("users").get();
        return snapshot.docs.map((doc) => doc.data() as User);
    }

    async addUser(user: User): Promise<void> {
        const existing = await this.findUserByUsername(user.username);
        if (existing) {
            throw new ValidationError("Username already exists");
        }
        // Use user.id as doc ID for easier lookup
        await this.db.collection("users").doc(user.id).set(user);
    }

    async updateUser(userId: string, updates: Partial<Omit<User, "id" | "createdAt">>): Promise<void> {
        const docRef = this.db.collection("users").doc(userId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundError("Pengguna tidak ditemukan.");
        }
        await docRef.update({
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    }

    async deleteUser(userId: string): Promise<void> {
        const docRef = this.db.collection("users").doc(userId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundError("Pengguna tidak ditemukan.");
        }
        await docRef.delete();
    }

    async getUsersByRole(role: UserRole): Promise<User[]> {
        const snapshot = await this.db.collection("users").where("role", "==", role).get();
        return snapshot.docs.map((doc) => doc.data() as User);
    }

    async findUserByUsername(username: string): Promise<User | undefined> {
        const snapshot = await this.db.collection("users").where("username", "==", username).limit(1).get();
        const doc = snapshot.docs[0];
        if (!doc) return undefined;
        return doc.data() as User;
    }

    // --- Reports ---

    async getReports(query: ReportQuery = {}): Promise<Report[]> {
        let collectionRef: admin.firestore.Query = this.db.collection("reports");

        // Firestore filtering is limited compared to in-memory or Mongo.
        // We can filter by status easily.
        if (query.status) {
            collectionRef = collectionRef.where("status", "==", query.status);
        }

        // Date range filtering
        if (query.from) {
            collectionRef = collectionRef.where("createdAt", ">=", query.from);
        }
        if (query.to) {
            collectionRef = collectionRef.where("createdAt", "<=", query.to);
        }

        // Ordering
        collectionRef = collectionRef.orderBy("createdAt", "desc");

        // Limit
        if (query.limit) {
            collectionRef = collectionRef.limit(query.limit);
        }

        const snapshot = await collectionRef.get();
        let reports = snapshot.docs.map((doc) => doc.data() as Report);

        // Client-side filtering for search (Firestore doesn't support full-text search natively)
        if (query.search) {
            const searchLower = query.search.toLowerCase();
            reports = reports.filter((report) =>
                [report.generalInfo.customerName, report.generalInfo.reportNumber, report.title]
                    .join(" ")
                    .toLowerCase()
                    .includes(searchLower)
            );
        }

        return reports;
    }

    async getReportById(reportId: string): Promise<Report | undefined> {
        const doc = await this.db.collection("reports").doc(reportId).get();
        if (!doc.exists) return undefined;
        return doc.data() as Report;
    }

    async addReport(report: Report): Promise<void> {
        await this.db.collection("reports").doc(report.id).set(report);
    }

    async updateReport(reportId: string, updates: Partial<Report>): Promise<void> {
        const docRef = this.db.collection("reports").doc(reportId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundError("Laporan tidak ditemukan.");
        }
        await docRef.update({
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    }

    async deleteReport(reportId: string): Promise<void> {
        const docRef = this.db.collection("reports").doc(reportId);
        await docRef.delete();
    }

    async updateReportStatus(reportId: string, status: ReportStatus, metadata: Partial<Report>): Promise<void> {
        const docRef = this.db.collection("reports").doc(reportId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundError("Laporan tidak ditemukan.");
        }

        const now = new Date().toISOString();
        const updates: Record<string, unknown> = {
            status,
            updatedAt: now,
            ...metadata,
        };

        if (status === "for_review") {
            updates.submittedAt = now;
        }
        if (status === "approved") {
            updates.approvedAt = now;
        }
        if (status === "rejected") {
            updates.rejectedAt = now;
        } else {
            updates.rejectedAt = admin.firestore.FieldValue.delete();
            updates.rejectionReason = admin.firestore.FieldValue.delete();
        }

        await docRef.update(updates);
    }

    // --- Counters ---

    async getNextReportNumber(): Promise<number> {
        const counterRef = this.db.collection("counters").doc("reportNumber");

        try {
            const result = await this.db.runTransaction(async (t) => {
                const doc = await t.get(counterRef);
                let current = 1000;
                if (doc.exists) {
                    current = doc.data()?.value || 1000;
                }
                const next = current + 1;
                t.set(counterRef, { value: next });
                return next;
            });
            return result;
        } catch (e) {
            console.error("Transaction failed: ", e);
            throw new Error("Failed to generate report number");
        }
    }

    async saveCounters(): Promise<void> {
        // No-op for Firestore as we update atomically in getNextReportNumber
    }

    // --- Settings ---

    async getSettings(): Promise<AppSettings> {
        const doc = await this.db.collection("settings").doc("global").get();
        if (!doc.exists) {
            // Return default settings if not found (or create them)
            return this.createDefaultSettings();
        }
        return doc.data() as AppSettings;
    }

    async updateSettings(updates: Partial<AppSettings>): Promise<void> {
        const docRef = this.db.collection("settings").doc("global");
        // Deep merge is tricky with Firestore update, so we might need to read-modify-write or use dot notation
        // For simplicity, let's read, merge in memory, and set.
        const current = await this.getSettings();

        // We need to merge carefully as updates might be partial
        // Re-using the merge logic from JSONDatabase would be ideal, but let's duplicate for now to avoid coupling
        // Actually, let's just use the same logic

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

        await docRef.set(merged);
    }

    private createDefaultSettings(): AppSettings {
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
                ],
                requiredLegalDocumentTypes: ["SHM", "IMB"],
                requireComparablesCount: 2,
                allowWarningsForSubmission: true,
            },
        };
    }
}
