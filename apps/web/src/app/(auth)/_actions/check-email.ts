"use server";

import { userRepository } from "@repo/database";
import { z } from "zod";
import { ActionResponse } from "@/lib/action-response";
import { getRegisterSchema } from "@/src/domains/auth/schemas/register.schema";
import { getDictionary } from "@/src/i18n/server";

export async function checkEmail(email: string): Promise<ActionResponse> {
  const dict = await getDictionary();
  const registerSchema = getRegisterSchema(dict);

  const checkEmailSchema = registerSchema.pick({
    email: true,
  });

  const parsed = checkEmailSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.invalid_email,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await userRepository.findByEmail(parsed.data.email);

  if (user) {
    return {
      success: false,
      message: dict.auth.errors.email_in_use,
      fieldErrors: {
        email: [dict.auth.errors.email_in_use],
      },
    };
  }

  return {
    success: true,
  };
}
