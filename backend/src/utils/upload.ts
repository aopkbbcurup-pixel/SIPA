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

const allowedFileTypes: Array<{ mime: string; extensions: string[] }> = [
  { mime: "image/jpeg", extensions: [".jpg", ".jpeg"] },
  { mime: "image/png", extensions: [".png"] },
  { mime: "image/webp", extensions: [".webp"] },
  { mime: "application/pdf", extensions: [".pdf"] },
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = allowedFileTypes.find(
      (type) =>
        type.mime === file.mimetype &&
        (type.extensions.length === 0 || type.extensions.includes(extension)),
    );
    if (!allowed) {
      return cb(
        new Error(
          `Tipe file tidak diizinkan untuk ${file.originalname}. Hanya JPG, PNG, WEBP, atau PDF.`,
        ),
      );
    }
    cb(null, true);
  },
});
