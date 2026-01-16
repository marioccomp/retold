import { z } from "zod";

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const passwordSchema = z.string().min(6, "Password must have at least 6 characters").max(17, "Password must have at most 17 characters");

export const registerSchema = z
  .object({
    name: z.preprocess(
      trim,
      z.string().min(3, "Name must have at least 3 characters").max(20, "Name must have at most 20 characters")
    ),

    username: z.preprocess(trim, z.string().min(3, "Username must have at least 3 characters").max(20, "Username must have at most 20 characters")),

    email: z.preprocess(
      trim,
      z.string().email("Invalid email format").transform((e) => e.toLowerCase())
    ),

    password: passwordSchema,

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

// Schema for updating password in settings
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const profileSchema = z.object({
  // MOVER ISSO AQUI PRA SCHEMA DE PROFILE
  title: z.preprocess(trim, z.string().max(50, "Title must have at most 50 characters")),

  bio: z.preprocess(trim, z.string().max(280, "Bio must have at most 280 characters")),

  githubUrl: z.preprocess(
    trim,
    z.string()
      .refine(
        (val) => {
          if (!val || val === "") return true;
          // Aceita: github.com/user, www.github.com/user, https://github.com/user
          const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;
          return githubRegex.test(val);
        },
        { message: "Use o formato: github.com/seu-usuario" }
      )
      .transform((val) => {
        if (!val || val === "") return "";
        // Normaliza para https://
        if (!val.startsWith("http")) {
          return `https://${val.replace(/^www\./, "")}`;
        }
        return val.replace(/^(https?:\/\/)www\./, "$1");
      })
      .optional()
      .or(z.literal(""))
  ),

  linkedinUrl: z.preprocess(
    trim,
    z.string()
      .refine(
        (val) => {
          if (!val || val === "") return true;
          // Aceita: linkedin.com/in/user, www.linkedin.com/in/user, https://linkedin.com/in/user
          const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
          return linkedinRegex.test(val);
        },
        { message: "Use o formato: linkedin.com/in/seu-usuario" }
      )
      .transform((val) => {
        if (!val || val === "") return "";
        // Normaliza para https://
        if (!val.startsWith("http")) {
          return `https://${val.replace(/^www\./, "")}`;
        }
        return val.replace(/^(https?:\/\/)www\./, "$1");
      })
      .optional()
      .or(z.literal(""))
  ),
});

// password: z    --> PRA USAR REGEX
// .string()
// .min(8)
// .max(64)
// .regex(/[A-Z]/, "Must contain an uppercase letter")
// .regex(/[0-9]/, "Must contain a number"),
