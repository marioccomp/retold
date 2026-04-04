"use server";

import { getForgotPasswordSchema } from "@/src/domains/auth/schemas/forgot-password.schema";
import { forgotPasswordService } from "@/src/domains/auth/services/forgot-password.service";
import type { ActionResponse } from "@/lib/action-response";
import { getDictionary } from "@/src/i18n/server";
import {
  enforceForgotPasswordRateLimit,
} from "@/src/domains/auth/services/public-auth-rate-limit.service";
import { TooManyRequestsError } from "@/src/domains/auth/auth.errors";

export async function forgotPassword(formData: FormData): Promise<ActionResponse<string>> {
  const dict = await getDictionary();
  const forgotPasswordSchema = getForgotPasswordSchema(dict);

  const data = Object.fromEntries(formData.entries());
  const parsed = forgotPasswordSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.invalid_email,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await enforceForgotPasswordRateLimit(parsed.data.email);
    await forgotPasswordService(parsed.data.email);

    return {
      success: true,
      data: dict.auth.errors.forgot_password_success,
    };
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      return {
        success: true,
        data: dict.auth.errors.forgot_password_success,
      };
    }

    console.error("forgot password error: ", error);
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}
