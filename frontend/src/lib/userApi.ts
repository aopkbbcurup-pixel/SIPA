import { api } from "./api";
import type { User, UserRole } from "../types/report";

export interface CreateUserPayload {
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
  unit?: string;
}

export interface UpdateUserPayload {
  username?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  unit?: string | null;
}

export async function fetchUsers() {
  const { data } = await api.get<User[]>("/users");
  return data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post<User>("/users", payload);
  return data;
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  const { data } = await api.put<User>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: string) {
  await api.delete(`/users/${userId}`);
}
