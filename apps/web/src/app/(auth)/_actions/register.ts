"use server";

import { z } from "zod";
import { registerUser } from "@/src/services/auth/register.service";

const registerSchema = z
  .object({
    name: z
      .string()
      .max(40, "Name must have at maximum 40 characters")
      .min(3, "Name must have at least 3 characters"),
    email: z.string().email("E-mail inválido"),
    username: z
      .string()
      .max(20, "Username must have at maximum 20 characters")
      .min(3, "Username must have at least 3 characters"),
    password: z
      .string()
      .max(17, "Password must have at maximum 17 characters")
      .min(6, "Password must have at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords are different",
    path: ["confirmPassword"],
  });

export async function register(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());

  const validatedFields = registerSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, username, password } = validatedFields.data;

  try {
    await registerUser({ name, email, username, password });
    return {
      success: "User created successfully",
    };
  } catch (error: any) {
    console.error(error);
    return {
      error: error.message,
    };
  }
}
