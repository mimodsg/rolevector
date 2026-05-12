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

export const updateAccountSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    email: z.string().trim().email().max(255),
    name: z.string().trim().min(2).max(120),
    newPassword: z.string().min(12).max(128).optional().or(z.literal("")),
    confirmPassword: z.string().max(128).optional().or(z.literal(""))
  })
  .superRefine((input, context) => {
    if (input.newPassword && input.newPassword !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"]
      });
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
