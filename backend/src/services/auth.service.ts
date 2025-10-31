import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../store/database";
import { env } from "../config/env";
import type { User } from "../types/domain";

export interface AuthPayload {
  sub: string;
  username: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: Omit<User, "passwordHash">;
}

export class AuthService {
  async login(username: string, password: string): Promise<LoginResult> {
    const user = db.findUserByUsername(username);
    if (!user) {
      throw new Error("User not found");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new Error("Invalid credentials");
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
