"use server";

import { userRepository } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { registerSchema } from "@/src/domains/auth/schemas/register.schema";
import { profileSchema } from "@/src/domains/auth/schemas/register.schema";

const checkNameSchema = registerSchema.pick({
  name: true,
});

const checkUsernameSchema = registerSchema.pick({
  username: true,
});

const checkBioSchema = profileSchema.pick({
  bio: true,
});

const checkTitleSchema = profileSchema.pick({
  title: true,
});

export async function changeTitle(title: string, userId: number): Promise<ActionResponse<string>> {
  const parsed = checkTitleSchema.safeParse({ title });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid title format",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, parsed.data);

    if (!user.title) {
      return {
        success: false,
        message: "User has no title set",
      };
    }
    return {
      success: true,
      data: user.title,
    };
  } catch (err) {
    return {
      success: false,
      message: "Unexpected error, try again later",
    };
  }
}

export async function changeBio(bio: string, userId: number): Promise<ActionResponse<string>> {
  const parsed = checkBioSchema.safeParse({ bio });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid name format",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, parsed.data);

    if (!user.bio) {
      return {
        success: false,
        message: "User has no bio set",
      };
    }
    return {
      success: true,
      data: user.bio,
    };
  } catch (err) {
    return {
      success: false,
      message: "Unexpected error, try again later",
    };
  }
}

export async function changeName(name: string, userId: number): Promise<ActionResponse<string>> {
  const parsed = checkNameSchema.safeParse({ name });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid name format",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, parsed.data);

    if (!user.name) {
      return {
        success: false,
        message: "User has no name set",
      };
    }
    return {
      success: true,
      data: user.name,
    };
  } catch (err) {
    return {
      success: false,
      message: "Unexpected error, try again later",
    };
  }
}
