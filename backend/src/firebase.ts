import * as functions from "firebase-functions";
import { createApp } from "./index";
import { db } from "./store/database";
import { env } from "./config/env";

// Ensure we are in Mongo mode for Firebase
// We can force this here or rely on env vars.
// Ideally, env vars should be set in Firebase Config.

let app: any;

export const api = functions.https.onRequest(async (req, res) => {
    if (!app) {
        // Force Firestore DB type if not set
        if (env.databaseType !== "firestore") {
            console.warn("Forcing database type to 'firestore' for Cloud Functions");
            // We might need to hack the env object if it's not mutable or reload config
            // But assuming the user sets the env var in Firebase, this is just a fallback check.
            (env as any).databaseType = "firestore";
        }

        try {
            await db.init();
        } catch (e) {
            console.error("Database init failed", e);
            res.status(500).send("Database connection failed");
            return;
        }

        const result = await createApp();
        app = result.app;
    }
    app(req, res);
});
