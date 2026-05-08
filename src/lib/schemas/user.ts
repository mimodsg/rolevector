import { z } from "zod";

export const userRoleSchema = z.enum(["Authenticated", "Admin"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(128),
  role: userRoleSchema.default("Authenticated")
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(12).max(128).optional(),
  role: userRoleSchema.optional()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
