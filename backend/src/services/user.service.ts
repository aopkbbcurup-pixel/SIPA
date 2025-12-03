import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "../store/database";
import type { User, UserRole } from "../types/domain";
import { AppError, NotFoundError, ValidationError } from "../utils/errors";

const SALT_ROUNDS = 10;

export interface CreateUserInput {
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
  unit?: string;
}

export interface UpdateUserInput {
  username?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  unit?: string;
}

type PublicUser = Omit<User, "passwordHash">;

const sanitizeUser = (user: User): PublicUser => {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
};

async function ensureUsernameUnique(username: string, excludeUserId?: string) {
  const users = await db.getUsers();
  const conflict = users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeUserId);
  if (conflict) {
    throw new ValidationError("Username sudah digunakan.");
  }
}

async function ensureAdminAvailability(targetUser: User, options: { nextRole?: UserRole; removing?: boolean }) {
  const users = await db.getUsers();
  const adminCount = users.filter((u) => u.role === "admin").length;
  const nextRole = options.nextRole ?? targetUser.role;
  const removing = options.removing ?? false;
  const demotingAdmin = targetUser.role === "admin" && nextRole !== "admin";

  if ((demotingAdmin || removing) && adminCount <= 1) {
    throw new AppError("Tidak dapat menghapus atau menurunkan admin terakhir.", 400, "LAST_ADMIN");
  }
}

class UserService {
  async list(): Promise<PublicUser[]> {
    const users = await db.getUsers();
    return users.map(sanitizeUser);
  }

  async getAppraisers(): Promise<PublicUser[]> {
    const users = await db.getUsers();
    return users.map(sanitizeUser);
  }

  async getUsers(currentUser: User): Promise<PublicUser[]> {
    const users = await db.getUsers();

    // If not admin, only show self
    if (currentUser.role !== "admin") {
      return users
        .filter(u => u.id === currentUser.id)
        .map(sanitizeUser);
    }
    return users.map(sanitizeUser);
  }

  async create(input: CreateUserInput): Promise<PublicUser> {
    await ensureUsernameUnique(input.username);

    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user: User = {
      id: randomUUID(),
      username: input.username,
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      ...(input.unit ? { unit: input.unit } : {}),
    };

    await db.addUser(user);
    return sanitizeUser(user);
  }

  async update(userId: string, input: UpdateUserInput): Promise<PublicUser> {
    const users = await db.getUsers();
    const existing = users.find((u) => u.id === userId);
    if (!existing) {
      throw new NotFoundError("User tidak ditemukan.");
    }

    if (typeof input.username === "string" && input.username !== existing.username) {
      await ensureUsernameUnique(input.username, existing.id);
    }

    if (typeof input.role === "string" && !["appraiser", "supervisor", "admin"].includes(input.role)) {
      throw new ValidationError("Role tidak valid.");
    }

    await ensureAdminAvailability(existing, input.role ? { nextRole: input.role } : {});

    const updates: Partial<User> = {};

    if (typeof input.username === "string" && input.username !== existing.username) {
      updates.username = input.username;
    }

    if (typeof input.fullName === "string" && input.fullName !== existing.fullName) {
      updates.fullName = input.fullName;
    }

    if (typeof input.role === "string" && input.role !== existing.role) {
      updates.role = input.role;
    }

    if (input.unit !== undefined && input.unit !== existing.unit) {
      updates.unit = input.unit;
    }

    if (typeof input.password === "string" && input.password) {
      updates.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return sanitizeUser(existing);
    }

    updates.updatedAt = new Date().toISOString();

    await db.updateUser(userId, updates);
    const updatedUsers = await db.getUsers();
    const updatedUser = updatedUsers.find((u) => u.id === userId);

    if (!updatedUser) {
      throw new NotFoundError("User not found after update");
    }

    return sanitizeUser(updatedUser);
  }

  async remove(userId: string, actorId?: string) {
    const users = await db.getUsers();
    const existing = users.find((u) => u.id === userId);
    if (!existing) {
      throw new NotFoundError("User tidak ditemukan.");
    }

    if (actorId && userId === actorId) {
      throw new AppError("Anda tidak dapat menghapus akun sendiri.", 400, "SELF_DELETE");
    }

    await ensureAdminAvailability(existing, { removing: true });
    await db.deleteUser(userId);
  }
}

export const userService = new UserService();
