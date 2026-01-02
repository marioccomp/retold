"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";

type CreateProjectInput = {
  title: string;
  description: string;
  visibility: "public" | "private";
  repositoryId: number;
};

export async function createProjectAction(input: CreateProjectInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      longerDescription: input.description,
      images: [],
      userId: Number(session.user.id),
      repositoryId: input.repositoryId,

      // se você quiser relacionar repo futuramente
      // repositoryId: input.repositoryId,
    },
  });
}
