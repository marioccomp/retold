"use server";

import { z } from "zod";

import { userRepository } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { getRegisterSchema } from "@/src/domains/auth/schemas/register.schema";
import { getProfileSchema, getProfileDetailsSchema } from "@/src/domains/profile/schemas/profile.schema";
import { getDictionary } from "@/src/i18n/server";

export async function changeTitle(title: string, userId: number): Promise<ActionResponse<string>> {
  const dict = await getDictionary();
  const profileSchema = getProfileSchema(dict);

  const checkTitleSchema = profileSchema.pick({
    title: true,
  });

  const parsed = checkTitleSchema.safeParse({ title });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.validation.title_format_invalid,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, parsed.data);

    if (!user.title) {
      return {
        success: false,
        message: dict.validation.title_empty,
      };
    }
    return {
      success: true,
      data: user.title,
    };
  } catch (err) {
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}

export async function changeBio(bio: string, userId: number): Promise<ActionResponse<string>> {
  const dict = await getDictionary();
  const profileSchema = getProfileSchema(dict);

  const checkBioSchema = profileSchema.pick({
    bio: true,
  });

  const parsed = checkBioSchema.safeParse({ bio });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.validation.bio_format_invalid,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, parsed.data);

    if (!user.bio) {
      return {
        success: false,
        message: dict.validation.bio_empty,
      };
    }
    return {
      success: true,
      data: user.bio,
    };
  } catch (err) {
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}

export async function changeName(name: string, userId: number): Promise<ActionResponse<string>> {
  const dict = await getDictionary();
  const registerSchema = getRegisterSchema(dict);

  const checkNameSchema = registerSchema.pick({
    name: true,
  });

  const parsed = checkNameSchema.safeParse({ name });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.validation.name_format_invalid,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, parsed.data);

    if (!user.name) {
      return {
        success: false,
        message: dict.validation.name_empty,
      };
    }
    return {
      success: true,
      data: user.name,
    };
  } catch (err) {
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}

export async function changeGithubUrl(githubUrl: string, userId: number): Promise<ActionResponse<string | null>> {
  const dict = await getDictionary();
  const profileSchema = getProfileSchema(dict);

  const checkGithubUrlSchema = profileSchema.pick({
    githubUrl: true,
  });

  const parsed = checkGithubUrlSchema.safeParse({ githubUrl });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.validation.url_format_invalid,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, {
      githubUrl: parsed.data.githubUrl || null
    });

    return {
      success: true,
      data: user.githubUrl,
    };
  } catch (err) {
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}

export async function changeLinkedinUrl(linkedinUrl: string, userId: number): Promise<ActionResponse<string | null>> {
  const dict = await getDictionary();
  const profileSchema = getProfileSchema(dict);

  const checkLinkedinUrlSchema = profileSchema.pick({
    linkedinUrl: true,
  });

  const parsed = checkLinkedinUrlSchema.safeParse({ linkedinUrl });

  if (!parsed.success) {
    return {
      success: false,
      message: dict.validation.url_format_invalid,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, {
      linkedinUrl: parsed.data.linkedinUrl || null
    });

    return {
      success: true,
      data: user.linkedinUrl,
    };
  } catch (err) {
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}

export async function updateProfile(
  data: any, // Using any here because inferred Zod type depends on dict
  userId: number
): Promise<ActionResponse<any>> {
  const dict = await getDictionary();
  const registerSchema = getRegisterSchema(dict);
  const profileSchema = getProfileSchema(dict);

  const checkNameSchema = registerSchema.pick({ name: true });
  const checkTitleSchema = profileSchema.pick({ title: true });
  const checkBioSchema = profileSchema.pick({ bio: true });
  const checkGithubUrlSchema = profileSchema.pick({ githubUrl: true });
  const checkLinkedinUrlSchema = profileSchema.pick({ linkedinUrl: true });
  const checkPhoneSchema = profileSchema.pick({ phone: true });
  const checkContactEmailSchema = profileSchema.pick({ contactEmail: true });

  const updateProfileSchema = z.object({
    name: checkNameSchema.shape.name,
    title: checkTitleSchema.shape.title,
    bio: checkBioSchema.shape.bio,
    githubUrl: checkGithubUrlSchema.shape.githubUrl,
    linkedinUrl: checkLinkedinUrlSchema.shape.linkedinUrl,
    websiteUrl: profileSchema.shape.websiteUrl,
    phone: checkPhoneSchema.shape.phone,
    contactEmail: checkContactEmailSchema.shape.contactEmail,
  });

  const parsed = updateProfileSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.invalid_fields,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileById(userId, {
      name: parsed.data.name,
      title: parsed.data.title,
      bio: parsed.data.bio,
      githubUrl: parsed.data.githubUrl || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      websiteUrl: parsed.data.websiteUrl || null,
      phone: parsed.data.phone || null,
      contactEmail: parsed.data.contactEmail || null,
    });

    return {
      success: true,
      data: user,
    };
  } catch (err) {
    return {
      success: false,
      message: dict.validation.generic_error,
    };
  }
}

export async function updateProfileDetails(
  data: any, // Using any because inferred type depends on dict
  userId: number
): Promise<ActionResponse<any>> {
  const dict = await getDictionary();
  const profileDetailsSchema = getProfileDetailsSchema(dict);
  const updateProfileDetailsSchema = profileDetailsSchema.partial();

  const parsed = updateProfileDetailsSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.invalid_fields,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await userRepository.updateProfileDetails(userId, {
      longBio: parsed.data.longBio ?? undefined,
      skills: parsed.data.skills ?? undefined,
      educations: parsed.data.educations?.map((edu: any) => ({
        ...edu,
        startDate: new Date(edu.startDate),
        endDate: edu.endDate ? new Date(edu.endDate) : null,
      })) ?? undefined,
    });

    return {
      success: true,
      data: user,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: dict.validation.details_update_error,
    };
  }
}
