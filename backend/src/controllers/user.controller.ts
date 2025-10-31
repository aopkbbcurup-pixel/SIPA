import type { Request, Response } from "express";
import { userService } from "../services/user.service";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function listUsersController(_req: Request, res: Response) {
  const users = userService.list();
  return res.json(users);
}

export async function createUserController(req: Request, res: Response) {
  try {
    const user = await userService.create(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function updateUserController(req: Request, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const user = await userService.update(id, req.body);
    return res.json(user);
  } catch (error) {
    const status = (error as Error).message === "User tidak ditemukan." ? 404 : 400;
    return res.status(status).json({ message: (error as Error).message });
  }
}

export async function deleteUserController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    await userService.remove(id, req.user?.id);
    return res.status(204).send();
  } catch (error) {
    const message = (error as Error).message;
    const status =
      message === "User tidak ditemukan."
        ? 404
        : message === "Anda tidak dapat menghapus akun sendiri."
          ? 400
          : 400;
    return res.status(status).json({ message });
  }
}
