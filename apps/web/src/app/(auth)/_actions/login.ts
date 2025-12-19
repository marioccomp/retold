"use server";

import { z } from "zod";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

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
  const loginLower = identifier.toLowerCase().trim();

  let isSuccessful = false;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: loginLower }, { username: loginLower }],
      },
    });

    if (!user) {
      return { error: "Invalid credentials" };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return { error: "Invalid credentials" };
    }

    isSuccessful = true;
  } catch (error) {
    console.log("Login error:", error);
    return { error: "An internal error occurred. Please try again." };
  }

  if (isSuccessful) {
    redirect("/");
  }
}
