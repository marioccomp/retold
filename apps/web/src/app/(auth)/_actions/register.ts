"use server";

import { registerUser } from "@/src/domains/auth/services/register.service";
import type { ActionResponse } from "@/lib/action-response";
import {
  EmailAlreadyInUseError,
  TooManyRequestsError,
  UsernameAlreadyInUseError,
} from "@/src/domains/auth/auth.errors";
import { getRegisterSchema } from "@/src/domains/auth/schemas/register.schema";
import { getDictionary } from "@/src/i18n/server";
import { enforceRegisterRateLimit } from "@/src/domains/auth/services/public-auth-rate-limit.service";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.auth-register");

type RegisterResponseData = {
  email: string;
  username: string;
};

export async function register(formData: FormData): Promise<ActionResponse<RegisterResponseData>> {
  const dict = await getDictionary();
  const registerSchema = getRegisterSchema(dict);

  const data = Object.fromEntries(formData.entries());

  const parsed = registerSchema.safeParse(data);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    if (fieldErrors.password?.includes(dict.auth.errors.passwords_mismatch)) {
      fieldErrors.password = [dict.auth.errors.passwords_mismatch];
    }

    return {
      success: false,
      message: dict.auth.errors.invalid_fields,
      fieldErrors,
    };
  }

  const { name, email, username, password } = parsed.data;

  try {
    await enforceRegisterRateLimit(email, username);
    await registerUser({ name, email, username, password });
    return {
      success: true,
      data: {
        email,
        username,
      },
    };
  } catch (error: unknown) {
    if (error instanceof TooManyRequestsError) {
      return {
        success: false,
        message: dict.auth.errors.too_many_attempts,
      };
    }

    if (error instanceof EmailAlreadyInUseError || error instanceof UsernameAlreadyInUseError) {
      return {
        success: false,
        message: dict.auth.errors.create_account_generic,
      };
    }

    logger.error("auth.register_failed", error, {
      hasName: Boolean(name),
      usernameLength: username.length,
    });
    return {
      success: false,
      message: dict.auth.errors.create_account_generic,
    };
  }
}
