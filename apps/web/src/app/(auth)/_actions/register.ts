"use server";

import { z } from "zod";
import { registerUser } from "@/src/services/auth/register.service";
import type { ActionResponse } from "@/lib/action-response";
import { EmailAlreadyInUseError, UsernameAlreadyInUseError } from "@/src/errors/auth.errors";

const registerSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters long")
      .max(40, "Name must be at most 40 characters long"),
    email: z.string().email("Invalid email address"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long")
      .max(20, "Username must be at most 20 characters long"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(17, "Password must be at most 17 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function register(formData: FormData): Promise<ActionResponse> {
  const data = Object.fromEntries(formData.entries());

  const parsed = registerSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid fields",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, username, password } = parsed.data;

  try {
    await registerUser({ name, email, username, password });
    return {
      success: true,
    };
  } catch (error: any) {
    if (error instanceof EmailAlreadyInUseError) {
      return {
        success: false,
        message: "This email is already in use",
        fieldErrors: {
          email: ["This email is already in use"],
        },
      };
    }

    if (error instanceof UsernameAlreadyInUseError) {
      return {
        success: false,
        message: "This username is already in use",
        fieldErrors: {
          username: ["This username is already in use"],
        },
      };
    }

    console.error("Register error:", error);
    return {
      success: false,
      message: "Unable to create account. Please try again.",
    };
  }
}
