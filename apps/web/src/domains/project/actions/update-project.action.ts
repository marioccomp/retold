"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_RECOMMENDED_TAG } from "@/src/app/(public)/(feed)/actions/constants";

type UpdateProjectInput = {
  id: number;
  title: string;
  description: string;
  visibility: "public" | "private";
  images?: string[];
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
  });

  if (!project) {
    throw new Error("Project not found or not owned by user");
  }

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
      // If setting to private, automatically unpin
      ...(input.visibility === "private" ? { isPinned: false } : {}),
      ...(input.images ? { images: input.images } : {}),
    },

  });

  revalidatePath(`/${session.user.username}`);
  // @ts-ignore
  revalidateTag(FEED_RECOMMENDED_TAG);
  revalidatePath("/");
  return updatedProject;
}
