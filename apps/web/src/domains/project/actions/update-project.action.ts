"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_RECOMMENDED_TAG } from "@/src/app/(public)/(feed)/actions/constants";
import { capitalizeSkill } from "@/lib/utils";

type UpdateProjectInput = {
  id: number;
  title: string;
  description: string;
  visibility: "public" | "private";
  images?: string[];
  manualTags?: string[];
  featuredTags?: string[];
};


export async function updateProjectAction(input: UpdateProjectInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: input.id,
      userId: Number(session.user.id),
    },
    include: {
      tags: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found or not owned by user");
  }

  const normalizedTags = Array.from(
    new Set((input.manualTags || []).map((tag) => capitalizeSkill(tag)).filter(Boolean))
  );
  const normalizedFeaturedTags = Array.from(
    new Set((input.featuredTags || []).map((tag) => capitalizeSkill(tag)).filter(Boolean))
  ).slice(0, 4);

  const nextTags = await Promise.all(
    normalizedTags.map((tagName) =>
      prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
        select: { id: true, name: true },
      })
    )
  );

  const featuredTagIds = nextTags
    .filter((tag) => normalizedFeaturedTags.includes(tag.name))
    .map((tag) => tag.id)
    .slice(0, 4);

  const updatedProject = await prisma.project.update({
    where: {
      id: input.id,
    },
    data: {
      title: input.title,
      description: input.description,
      // Also update longerDescription to keep them in sync if it's the same
      longerDescription: input.description,
      visibility: input.visibility,
      featuredTagIds,
      // If setting to private, automatically unpin
      ...(input.visibility === "private" ? { isPinned: false } : {}),
      ...(input.images ? { images: input.images } : {}),
      tags: {
        set: nextTags.map((tag) => ({ id: tag.id })),
      },
    },

  });

  revalidatePath(`/${session.user.username}`);
  // @ts-ignore
  revalidateTag(FEED_RECOMMENDED_TAG);
  revalidatePath("/");
  return updatedProject;
}
