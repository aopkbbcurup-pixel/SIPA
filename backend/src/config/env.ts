import dotenv from "dotenv";
import path from "node:path";
import fs from "fs-extra";

dotenv.config();

const rootDir = path.resolve(__dirname, "..", "..");
const rawJwtSecret = process.env.JWT_SECRET;
const rawServeFrontend = process.env.SIPA_SERVE_FRONTEND === "true";
const rawFrontendDist = process.env.SIPA_FRONTEND_DIST;
const rawMode = process.env.SIPA_MODE;
const rawApiBaseUrl = process.env.SIPA_API_BASE_URL;
const rawPublicApiBaseUrl = process.env.SIPA_PUBLIC_API_BASE_URL;
const rawGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!rawJwtSecret) {
  throw new Error("JWT_SECRET environment variable is required. Please set it in your environment or .env file.");
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || "0.0.0.0",
  jwtSecret: rawJwtSecret,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  pdfDir: process.env.PDF_OUTPUT_DIR || "generated-pdfs",
  dataFile: process.env.DATA_FILE || path.join("storage", "database.json"),
  mode: rawMode === "server" || rawMode === "client" ? rawMode : "standalone",
  serveFrontend: rawServeFrontend,
  apiBaseUrl: rawApiBaseUrl ?? "",
  publicApiBaseUrl: rawPublicApiBaseUrl ?? "",
  googleMapsApiKey: rawGoogleMapsApiKey ?? "",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/sipa",
  databaseType: (process.env.DATABASE_TYPE || "json") as "json" | "mongo" | "firestore",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

function resolvePath(targetPath: string) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
}

export const paths = {
  root: rootDir,
  uploadDir: resolvePath(env.uploadDir),
  pdfDir: resolvePath(env.pdfDir),
  dataFile: resolvePath(env.dataFile),
  frontendDist: rawFrontendDist ? resolvePath(rawFrontendDist) : undefined,
};

export async function ensureDirectories() {
  await Promise.all([paths.uploadDir, paths.pdfDir, path.dirname(paths.dataFile)].map((dir) => fs.ensureDir(dir)));
}
