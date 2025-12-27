"use server";
import { forgotPasswordSchema } from "@/src/domains/auth/schemas/forgot-password.schema";
import { forgotPasswordService } from "@/src/domains/auth/services/forgot-password.service";
import type { ActionResponse } from "@/lib/action-response";
import { parseEnv } from "util";

export async function forgotPassword(formData: FormData): Promise<ActionResponse<string>> {
  const data = Object.fromEntries(formData.entries());
  const parsed = forgotPasswordSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid Email",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await forgotPasswordService(parsed.data.email);

    return {
      success: true,
      data: "If this email address is registered, you will receive a recovery link.",
    };
  } catch (error) {
    console.error("forgot password error: ", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}
