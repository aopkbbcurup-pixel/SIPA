import * as admin from "firebase-admin";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEFAULT_SALT_ROUNDS = 10;

async function seed() {
    // Initialize Firebase
    // Try to find serviceAccountKey.json in backend root
    const keyPath = path.resolve(__dirname, "../../serviceAccountKey.json");

    try {
        const serviceAccount = require(keyPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("Initialized Firebase with serviceAccountKey.json");
    } catch (e) {
        console.log("Could not load serviceAccountKey.json, trying GOOGLE_APPLICATION_CREDENTIALS or default...");
        admin.initializeApp();
    }

    const db = admin.firestore();
    const password = await bcrypt.hash("password123", DEFAULT_SALT_ROUNDS);
    const now = new Date().toISOString();

    const users = [
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
    ];

    console.log("Seeding users...");

    for (const user of users) {
        const userRef = db.collection("users").doc(user.id);
        const doc = await userRef.get();
        if (!doc.exists) {
            // Check by username to be safe
            const snapshot = await db.collection("users").where("username", "==", user.username).get();
            if (snapshot.empty) {
                await userRef.set(user);
                console.log(`Created user: ${user.username}`);
            } else {
                console.log(`User ${user.username} already exists (by username)`);
            }
        } else {
            console.log(`User ${user.username} already exists (by ID)`);
        }
    }

    console.log("Seeding completed!");
}

seed().catch(console.error);
