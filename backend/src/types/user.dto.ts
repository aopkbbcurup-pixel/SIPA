import { z } from "zod";

const userRoleEnum = z.enum(["appraiser", "supervisor", "admin"]);

export const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal terdiri dari 3 karakter."),
  fullName: z.string().min(3, "Nama lengkap minimal terdiri dari 3 karakter."),
  role: userRoleEnum,
  unit: z.string().optional(),
  password: z.string().min(6, "Password minimal terdiri dari 6 karakter."),
});

export const updateUserSchema = z
  .object({
    username: z.string().min(3, "Username minimal terdiri dari 3 karakter.").optional(),
    fullName: z.string().min(3, "Nama lengkap minimal terdiri dari 3 karakter.").optional(),
    role: userRoleEnum.optional(),
    unit: z.string().nullable().optional(),
    password: z.string().min(6, "Password minimal terdiri dari 6 karakter.").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diisi untuk pembaruan.",
  });
