"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "@repo/database";
export async function getUserProjectsAction() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const projects = await userRepository.getAllUserProjects(Number(session.user.id));

  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,

    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),

    repository: project.repository
      ? {
          id: project.repository.id,
          name: project.repository.name,
          fullName: project.repository.fullName,
          url: project.repository.url,
          isActive: project.repository.isActive,
        }
      : null,
  }));
}
