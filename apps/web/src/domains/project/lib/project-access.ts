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

/**
 * Public projects are visible to everyone. Private projects are visible to the
 * owner and to project members: accepted collaborators and invited users (an
 * invitee needs to see the project to decide whether to accept).
 */
export function canAccessProject(
  project: Pick<ProjectAccessContext, "userId" | "visibility">,
  currentUserId?: number | null,
  isMemberOrInvited = false
) {
  return (
    project.visibility !== "private" ||
    (currentUserId != null && project.userId === currentUserId) ||
    (currentUserId != null && isMemberOrInvited)
  );
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
      ...(currentUserId
        ? {
            collaborators: {
              where: { userId: currentUserId },
              select: { status: true },
            },
          }
        : {}),
    },
  });

  if (!project) {
    throw new ProjectAccessError("PROJECT_NOT_FOUND");
  }

  const membership = (project as { collaborators?: { status: string }[] }).collaborators ?? [];

  if (!canAccessProject(project, currentUserId, membership.length > 0)) {
    throw new ProjectAccessError("PROJECT_NOT_ACCESSIBLE");
  }

  return { id: project.id, userId: project.userId, visibility: project.visibility };
}
