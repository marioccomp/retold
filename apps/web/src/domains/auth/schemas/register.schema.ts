import { z } from "zod";
import { USERNAME_REGEX } from "../auth.constants";

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const getPasswordSchema = (dict: any) =>
  z.string()
    .min(6, dict.validation.password_min)
    .max(17, dict.validation.password_max);

export const getRegisterSchema = (dict: any) =>
  z.object({
    name: z.preprocess(
      trim,
      z.string()
        .min(3, dict.validation.name_min)
        .max(20, dict.validation.name_max)
    ),

    username: z.preprocess(
      trim,
      z.string()
        .min(3, dict.validation.username_min)
        .max(20, dict.validation.username_max)
        .regex(USERNAME_REGEX, dict.validation.username_regex)
        .transform((u) => u.toLowerCase())
    ),

    email: z.preprocess(
      trim,
      z.string()
        .email(dict.validation.email_invalid)
        .transform((e) => e.toLowerCase())
    ),

    password: getPasswordSchema(dict),

    confirmPassword: z.string(),
  })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          path: ["confirmPassword"],
          message: dict.auth.errors.passwords_mismatch,
          code: z.ZodIssueCode.custom,
        });
      }
    });

// Schema for updating password in settings
export const getUpdatePasswordSchema = (dict: any) =>
  z.object({
    currentPassword: z.string().min(1, dict.validation.current_password_required),
    newPassword: getPasswordSchema(dict),
    confirmPassword: z.string().min(1, dict.validation.confirm_password_required),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: dict.auth.errors.passwords_mismatch,
    path: ["confirmPassword"],
  });


// Schema for creating password (when user has no password)
export const getCreatePasswordSchema = (dict: any) =>
  z.object({
    email: z.preprocess(
      trim,
      z.string().email(dict.validation.email_invalid).transform((e) => e.toLowerCase())
    ),
    newPassword: getPasswordSchema(dict),
    confirmPassword: z.string().min(1, dict.validation.confirm_password_required),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: dict.auth.errors.passwords_mismatch,
    path: ["confirmPassword"],
  });
