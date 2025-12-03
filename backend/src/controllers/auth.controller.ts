import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { AppError } from "../utils/errors";

export async function loginController(req: Request, res: Response) {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      return res.status(400).json({ message: "Username dan password wajib diisi." });
    }

    const result = await authService.login({ username, password });
    return res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ message: error.message, ...(error.code ? { code: error.code } : {}) });
    }
    console.error("Login error:", error);
    return res.status(500).json({ message: "Terjadi kesalahan internal server." });
  }
}
