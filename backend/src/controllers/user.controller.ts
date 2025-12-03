import type { Request, Response } from "express";
import { userService } from "../services/user.service";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AppError } from "../utils/errors";

const respondUserError = (res: Response, error: unknown, fallbackStatus = 400) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, ...(error.code ? { code: error.code } : {}) });
  }
  return res.status(fallbackStatus).json({ message: (error as Error).message });
};

export async function listUsersController(_req: Request, res: Response) {
  const users = await userService.list();
  return res.json(users);
}

export async function createUserController(req: Request, res: Response) {
  try {
    const user = await userService.create(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return respondUserError(res, error);
  }
}

export async function updateUserController(req: Request, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const user = await userService.update(id, req.body);
    return res.json(user);
  } catch (error) {
    return respondUserError(res, error);
  }
}

export async function deleteUserController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    await userService.remove(id, req.user?.id);
    return res.status(204).send();
  } catch (error) {
    return respondUserError(res, error);
  }
}
