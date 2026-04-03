"use server";

import { userRepository } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { getRegisterSchema } from "@/src/domains/auth/schemas/register.schema";
import { getDictionary } from "@/src/i18n/server";
import { enforceAvailabilityCheckRateLimit } from "@/src/domains/auth/services/public-auth-rate-limit.service";
import { TooManyRequestsError } from "@/src/domains/auth/auth.errors";

export async function checkUsername(username: string): Promise<ActionResponse> {
  const dict = await getDictionary();
  const registerSchema = getRegisterSchema(dict);

  const parsed = registerSchema.pick({ username: true }).safeParse({ username });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.invalid_username,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await enforceAvailabilityCheckRateLimit("username", parsed.data.username);
    await userRepository.findByUsername(parsed.data.username);
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      return {
        success: false,
        message: dict.auth.errors.too_many_attempts,
      };
    }

    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }

  return { success: true };
}
