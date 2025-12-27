"use server";

import { z } from "zod";
import { userRepository } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { registerSchema } from "@/src/domains/auth/schemas/register.schema";

export async function checkUsername(username: string): Promise<ActionResponse> {
  const parsed = registerSchema.pick({ username: true }).safeParse({ username });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid username",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const exists = await userRepository.findByUsername(parsed.data.username);

  if (exists) {
    return {
      success: false,
      message: "Username already in use",
      fieldErrors: {
        username: ["Username already in use"],
      },
    };
  }

  return { success: true };
}
