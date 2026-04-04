import { prisma } from "@repo/database";

type ProjectVisibility = "public" | "private" | string;

export class ProjectAccessError extends Error {
  constructor(public readonly code: "PROJECT_NOT_FOUND" | "PROJECT_NOT_ACCESSIBLE") {
    super(code === "PROJECT_NOT_FOUND" ? "Project not found" : "Project not accessible");
    this.name = "ProjectAccessError";
  }
}

export type ProjectAccessContext = {
  id: number;
  userId: number;
  visibility: ProjectVisibility;
};

export function canAccessProject(
  project: Pick<ProjectAccessContext, "userId" | "visibility">,
  currentUserId?: number | null
) {
  return project.visibility !== "private" || project.userId === currentUserId;
}

export async function requireProjectAccess(
  projectId: number,
  currentUserId?: number | null
): Promise<ProjectAccessContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      userId: true,
      visibility: true,
    },
  });

  if (!project) {
    throw new ProjectAccessError("PROJECT_NOT_FOUND");
  }

  if (!canAccessProject(project, currentUserId)) {
    throw new ProjectAccessError("PROJECT_NOT_ACCESSIBLE");
  }

  return project;
}
