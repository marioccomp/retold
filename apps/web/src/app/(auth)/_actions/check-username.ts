"use server";

import { z } from "zod";
import { userRepository } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { getRegisterSchema } from "@/src/domains/auth/schemas/register.schema";
import { getDictionary } from "@/src/i18n/server";

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

  const exists = await userRepository.findByUsername(parsed.data.username);

  if (exists) {
    return {
      success: false,
      message: dict.auth.errors.username_in_use,
      fieldErrors: {
        username: [dict.auth.errors.username_in_use],
      },
    };
  }

  return { success: true };
}
