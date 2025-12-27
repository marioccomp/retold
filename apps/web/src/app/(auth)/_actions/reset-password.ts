"use server";

import { resetPasswordSchema } from "@/src/domains/auth/schemas/reset-password.schema";
import { resetPasswordService } from "@/src/domains/auth/services/reset-password.service";
import type { ActionResponse } from "@/lib/action-response";

export async function resetPassword(formData: FormData): Promise<ActionResponse> {
  const data = Object.fromEntries(formData.entries());
  const parsed = resetPasswordSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid Data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await resetPasswordService(parsed.data.token, parsed.data.password);

    return { success: true };
  } catch (error) {
    console.error("Reset password error", error);

    return {
      success: false,
      message: "Invalid or expired recovery link.",
    };
  }
}
