import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(3).max(20),
    username: z.string().min(3).max(20),
    email: z
      .string()
      .email("Invalid email address")
      .transform((email) => email.toLowerCase().trim()),
    password: z.string().min(6).max(17),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Passwords do not match",
        code: z.ZodIssueCode.custom,
      });
    }
  });
