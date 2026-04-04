"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/src/domains/auth/auth";
import type { ActionResponse } from "@/lib/action-response";
import { InvalidCredentialsError, TooManyLoginAttemptsError } from "@/src/domains/auth/auth.errors";
import { checkLoginRateLimit } from "@/src/domains/auth/services/login.service";
import { getDictionary } from "@/src/i18n/server";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.auth-login");

export async function login(formData: FormData): Promise<ActionResponse> {
  const dict = await getDictionary();

  const loginSchema = z.object({
    identifier: z.string().min(3, dict.validation.identifier_required),
    password: z.string().min(6, dict.validation.password_required),
  });

  const data = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.incorrect_credentials, // Se não tá no formato que a gente definiu, nem busca no banco
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Step 1: Redis Rate Limiting ONLY
    await checkLoginRateLimit(parsed.data.identifier);

    // Step 2: NextAuth Session Creation (DB + Bcrypt happen here ONLY)
    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof TooManyLoginAttemptsError) {
      return {
        success: false,
        message: dict.auth.errors.too_many_attempts,
      };
    }

    if (error instanceof InvalidCredentialsError) {
      return {
        success: false,
        message: dict.auth.errors.incorrect_credentials,
      };
    }

    // Se o NextAuth (CredentialsSignin) falhar no authorize, ele cai aqui como AuthError.
    if (error instanceof AuthError) {
      return {
        success: false,
        message: dict.auth.errors.incorrect_credentials,
      };
    }

    logger.error("auth.login_unexpected_failure", error, {
      identifierType: parsed.data.identifier.includes("@") ? "email" : "username",
    });

    return {
      success: false,
      message: dict.auth.errors.login_generic,
    };
  }
}
