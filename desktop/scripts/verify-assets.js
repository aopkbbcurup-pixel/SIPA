const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

const requiredFiles = [
  {
    label: "Frontend build (index.html)",
    filePath: path.join(rootDir, "build", "frontend", "dist", "index.html"),
  },
  {
    label: "Frontend config (sipa-config.js)",
    filePath: path.join(rootDir, "build", "frontend", "dist", "sipa-config.js"),
  },
  {
    label: "Backend entry (dist/index.js)",
    filePath: path.join(rootDir, "build", "backend", "dist", "index.js"),
  },
  {
    label: "Backend package.json",
    filePath: path.join(rootDir, "build", "backend", "package.json"),
  },
];

const missing = requiredFiles.filter((target) => !fs.existsSync(target.filePath));

if (missing.length > 0) {
  console.error("❌ Build asset belum lengkap:");
  missing.forEach((target) => {
    console.error(`  - ${target.label} tidak ditemukan di ${target.filePath}`);
  });
  console.error("Pastikan perintah build backend & frontend sukses sebelum packaging.");
  process.exit(1);
}

if (!process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY.length === 0) {
  console.warn("⚠️  GOOGLE_MAPS_API_KEY belum terisi. Snapshot peta akan membutuhkan input manual saat runtime.");
}

console.log("✅ Asset build diverifikasi. Siap dilanjutkan ke proses packaging.");
