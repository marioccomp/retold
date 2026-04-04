"use server";

import { z } from "zod";
import { registerUser } from "@/src/domains/auth/services/register.service";
import type { ActionResponse } from "@/lib/action-response";
import { EmailAlreadyInUseError, UsernameAlreadyInUseError } from "@/src/domains/auth/auth.errors";
import { getRegisterSchema } from "@/src/domains/auth/schemas/register.schema";
import { getDictionary } from "@/src/i18n/server";

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
        message: dict.auth.errors.email_in_use,
        fieldErrors: {
          email: [dict.auth.errors.email_in_use],
        },
      };
    }

    if (error instanceof UsernameAlreadyInUseError) {
      return {
        success: false,
        message: dict.auth.errors.username_in_use,
        fieldErrors: {
          username: [dict.auth.errors.username_in_use],
        },
      };
    }

    console.error("Register error:", error);
    return {
      success: false,
      message: dict.auth.errors.create_account_generic,
    };
  }
}
