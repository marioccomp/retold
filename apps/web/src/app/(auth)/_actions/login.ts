"use server";

import { z } from "zod";
import { signIn } from "@/src/auth";
import { AuthError } from "next-auth";

const loginSchema = z.object({
  identifier: z.string().min(3, "Email or username is required"),
  password: z.string().min(6, "password is required"),
});

export async function login(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const validatedFields = loginSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      error: "Please fill in all fields correctly.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { identifier, password } = validatedFields.data;

  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "something went wrong. Please try again." };
      }
    }
    throw error;
  }
}
