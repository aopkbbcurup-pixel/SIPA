import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../store/database";
import { env } from "../config/env";
import type { User } from "../types/domain";
import { AppError, NotFoundError, AuthenticationError } from "../utils/errors";

export interface AuthPayload {
  sub: string;
  username: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: Omit<User, "passwordHash">;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { username, password } = credentials;

    const user = await db.findUserByUsername(username);
    if (!user) {
      throw new AuthenticationError("Invalid username or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Kredensial tidak valid.", 401, "INVALID_CREDENTIALS");
    }

    const payload: AuthPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });

    const { passwordHash, ...userSafe } = user;
    return { token, user: userSafe };
  }

  verify(token: string) {
    return jwt.verify(token, env.jwtSecret) as AuthPayload;
  }
}

export const authService = new AuthService();
