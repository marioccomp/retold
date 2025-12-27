"use server";

import { userRepository } from "@repo/database";
import { z } from "zod";
import { ActionResponse } from "@/lib/action-response";
import { registerSchema } from "@/src/domains/auth/schemas/register.schema";

const checkEmailSchema = registerSchema.pick({
  email: true,
});

export async function checkEmail(email: string): Promise<ActionResponse> {
  const parsed = checkEmailSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid email address",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await userRepository.findByEmail(parsed.data.email);

  if (user) {
    return {
      success: false,
      message: "Email already in use",
      fieldErrors: {
        email: ["Email already in use"],
      },
    };
  }

  return {
    success: true,
  };
}
