import type { Request, Response } from "express";
import { authService } from "../services/auth.service";

export async function loginController(req: Request, res: Response) {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const result = await authService.login(username, password);
    return res.json(result);
  } catch (error) {
    return res.status(401).json({ message: (error as Error).message });
  }
}
