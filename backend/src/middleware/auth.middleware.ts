import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import { UserRole } from "../types/domain";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export function authenticate(requiredRoles?: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const [, token] = authHeader.split(" ");
    if (!token) {
      return res.status(401).json({ message: "Invalid Authorization header" });
    }

    try {
      const payload = authService.verify(token);
      req.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role as UserRole,
      };

      if (requiredRoles && !requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
