"use server";

import { z } from "zod";
import { registerUser } from "@/src/domains/auth/services/register.service";
import type { ActionResponse } from "@/lib/action-response";
import { EmailAlreadyInUseError, UsernameAlreadyInUseError } from "@/src/domains/auth/auth.errors";
import { registerSchema } from "@/src/domains/auth/schemas/register.schema";

type RegisterResponseData = {
  email: string;
  username: string;
};

export async function register(formData: FormData): Promise<ActionResponse<RegisterResponseData>> {
  const data = Object.fromEntries(formData.entries());

  const parsed = registerSchema.safeParse(data);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    if (fieldErrors.password?.includes("Passwords do not match")) {
      fieldErrors.password = ["Passwords do not match"];
    }

    return {
      success: false,
      message: "Invalid fields",
      fieldErrors,
    };
  }

  const { name, email, username, password } = parsed.data;

  try {
    await registerUser({ name, email, username, password });
    return {
      success: true,
      data: {
        email,
        username,
      },
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
