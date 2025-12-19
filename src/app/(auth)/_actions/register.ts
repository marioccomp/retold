"use server";

import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { error } from "console";

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

  console.log(validatedFields);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password, username } = validatedFields.data;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase().trim() }, { username: username.toLowerCase().trim() }],
      },
    });

    if (existingUser) {
      const inputEmail = email.toLowerCase().trim();
      const inputUsername = username.toLowerCase().trim();
      const dbEmail = existingUser.email.toLowerCase().trim();
      const dbUsername = existingUser.username.toLowerCase().trim();

      if (dbEmail === inputEmail) {
        return { error: "E-mail already in use" };
      }

      if (dbUsername === inputUsername) {
        console.log("ta entrando nessa porra aqui?");
        return { error: "Username already in use" };
      }

      return { error: "User already exists with these credentials" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        password: hashedPassword,
      },
    });

    return {
      success: "User created successfully",
    };
  } catch (error) {
    console.error(error);
    return { error: "An internal error ocurred. Try again" };
  }
}
