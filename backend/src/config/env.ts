import dotenv from "dotenv";
import path from "node:path";
import fs from "fs-extra";

dotenv.config();

const rootDir = path.resolve(__dirname, "..", "..");
const rawJwtSecret = process.env.JWT_SECRET;

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
};

export const paths = {
  root: rootDir,
  uploadDir: path.join(rootDir, env.uploadDir),
  pdfDir: path.join(rootDir, env.pdfDir),
  dataFile: path.join(rootDir, env.dataFile),
};

export async function ensureDirectories() {
  await Promise.all([paths.uploadDir, paths.pdfDir, path.dirname(paths.dataFile)].map((dir) => fs.ensureDir(dir)));
}
