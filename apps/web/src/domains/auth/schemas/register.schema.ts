import { z } from "zod";

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const registerSchema = z
  .object({
    name: z.preprocess(trim, z.string().min(3).max(20)),

    username: z.preprocess(trim, z.string().min(3).max(20)),

    email: z.preprocess(
      trim,
      z
        .string()
        .email()
        .transform((e) => e.toLowerCase())
    ),

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

export const profileSchema = z.object({
  // MOVER ISSO AQUI PRA SCHEMA DE PROFILE
  title: z.preprocess(
    trim,
    z
      .string()
      .min(3, "Title must have at least 3 characters")
      .max(50, "Title must have at most 50 characters")
  ),

  bio: z.preprocess(trim, z.string().max(280, "Bio must have at most 280 characters")),
});

// password: z    --> PRA USAR REGEX
// .string()
// .min(8)
// .max(64)
// .regex(/[A-Z]/, "Must contain an uppercase letter")
// .regex(/[0-9]/, "Must contain a number"),
