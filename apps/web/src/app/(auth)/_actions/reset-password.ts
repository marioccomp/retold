"use server";

import { getResetPasswordSchema } from "@/src/domains/auth/schemas/reset-password.schema";
import { resetPasswordService } from "@/src/domains/auth/services/reset-password.service";
import type { ActionResponse } from "@/lib/action-response";
import { getDictionary } from "@/src/i18n/server";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.auth-reset-password");

export async function resetPassword(formData: FormData): Promise<ActionResponse> {
  const dict = await getDictionary();
  const resetPasswordSchema = getResetPasswordSchema(dict);

  const data = Object.fromEntries(formData.entries());
  const parsed = resetPasswordSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.invalid_fields,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await resetPasswordService(parsed.data.token, parsed.data.password);

    return { success: true };
  } catch (error) {
    logger.error("auth.reset_password_failed", error);

    return {
      success: false,
      message: dict.auth.errors.reset_password_error,
    };
  }
}
