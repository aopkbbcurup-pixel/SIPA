import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { paths } from "../config/env";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, paths.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const allowedMime = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error("Tipe file tidak diizinkan"));
    }
    cb(null, true);
  },
});
