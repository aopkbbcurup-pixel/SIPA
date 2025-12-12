import fs from "fs-extra";
import path from "node:path";
import mongoose from "mongoose";
import { env, paths } from "../config/env";
import { UserModel, ReportModel, AppSettingsModel } from "../store/models";
import type { User, Report, AppSettings } from "../types/domain";

async function migrate() {
    console.log("Starting migration from JSON to MongoDB...");

    // 1. Connect to MongoDB
    if (!env.mongoUri) {
        console.error("MONGO_URI not defined in environment variables.");
        process.exit(1);
    }

    try {
        await mongoose.connect(env.mongoUri);
        console.log("Connected to MongoDB.");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }

    // 2. Read JSON Data
    const dbPath = paths.dataFile;
    if (!fs.existsSync(dbPath)) {
        console.error(`JSON database file not found at ${dbPath}`);
        process.exit(1);
    }

    const data = await fs.readJSON(dbPath);
    const users: User[] = data.users || [];
    const reports: Report[] = data.reports || [];
    const settings: AppSettings | undefined = data.settings;

    console.log(`Found ${users.length} users, ${reports.length} reports, and settings.`);

    // 3. Migrate Users
    for (const user of users) {
        const exists = await UserModel.findOne({ id: user.id });
        if (!exists) {
            await UserModel.create(user);
            console.log(`Migrated user: ${user.username}`);
        } else {
            console.log(`User ${user.username} already exists, skipping.`);
        }
    }

    // 4. Migrate Reports
    for (const report of reports) {
        const exists = await ReportModel.findOne({ id: report.id });
        if (!exists) {
            console.log(`Migrating report: ${report.id} (${report.generalInfo.reportNumber})`);

            // Sanitize data
            if (report.signatures && Object.keys(report.signatures).length === 0) {
                delete report.signatures;
            }

            try {
                await ReportModel.create(report);
                console.log(`Migrated report: ${report.generalInfo.reportNumber}`);
            } catch (err: unknown) {
                console.error(`Failed to migrate report ${report.id}:`, JSON.stringify(err, null, 2));
            }
        } else {
            console.log(`Report ${report.generalInfo.reportNumber} already exists, skipping.`);
        }
    }

    // 5. Migrate Settings
    if (settings) {
        const count = await AppSettingsModel.countDocuments();
        if (count === 0) {
            await AppSettingsModel.create(settings);
            console.log("Migrated app settings.");
        } else {
            console.log("App settings already exist, skipping.");
        }
    }

    console.log("Migration completed successfully.");
    process.exit(0);
}

migrate().catch((error) => {
    console.error("Migration failed:", JSON.stringify(error, null, 2));
    process.exit(1);
});
