import { Prisma, prisma } from "@repo/database";
import { userAnalyzeQueue } from "@repo/queue";
import { createLogger } from "@repo/observability";

/**
 * Project collaborators (team projects).
 *
 * A project has one owner (Project.userId, who linked the repository through
 * their GitHub App installation) and any number of collaborators. The owner
 * invites by username; the invitation only counts once accepted. Each member's
 * contribution is computed from the same repository by the user-worker, using
 * that member's own commit identity, so every member gets credit for their own
 * commits only.
 *
 * These functions take the acting user's id explicitly (no session access), so
 * they can be tested directly; the server actions wrap them with auth.
 */

const logger = createLogger("web.domain.project-collaborators");

export const MAX_COLLABORATORS_PER_PROJECT = 10;

export type CollaboratorErrorCode =
  | "PROJECT_NOT_FOUND"
  | "NOT_PROJECT_OWNER"
  | "USER_NOT_FOUND"
  | "CANNOT_INVITE_SELF"
  | "ALREADY_MEMBER"
  | "ALREADY_INVITED"
  | "TOO_MANY_COLLABORATORS"
  | "INVITATION_NOT_FOUND"
  | "NOT_A_MEMBER";

export class CollaboratorError extends Error {
  constructor(public readonly code: CollaboratorErrorCode) {
    super(code);
    this.name = "CollaboratorError";
  }
}

const memberUserSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const;

export type TeamMemberUser = {
  id: number;
  name: string | null;
  username: string | null;
  image: string | null;
};

export type TeamMemberStats = {
  commitsCount: number;
  linesAdded: number;
  linesDeleted: number;
  activeDays: number;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
};

export type TeamMember = {
  user: TeamMemberUser;
  role: "owner" | "collaborator";
  stats: TeamMemberStats | null;
};

export type ProjectTeam = {
  viewerId: number | null;
  viewerRole: "owner" | "collaborator" | "invited" | "none";
  members: TeamMember[];
  /** Pending invitations; only returned to the owner. */
  pendingInvitations: { user: TeamMemberUser; invitedAt: string }[];
  maxCollaborators: number;
};

function normalizeUsername(username: string) {
  return username.trim().replace(/^@/, "");
}

/** Schedules a stats recalculation so a new member's commits show up. */
async function scheduleTeamStatsRecalculation(projectId: number) {
  try {
    await userAnalyzeQueue.add(
      "analyze-user",
      { projectId },
      {
        delay: 5_000,
        deduplication: { id: `team-stats-${projectId}`, ttl: 60_000 },
      }
    );
  } catch (error) {
    // Not fatal: the next push or analysis recalculates the stats anyway.
    logger.warn("collaborators.stats_recalculation_enqueue_failed", { projectId }, error);
  }
}

export async function inviteCollaborator(input: {
  projectId: number;
  ownerId: number;
  username: string;
}) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, userId: true },
  });

  if (!project) throw new CollaboratorError("PROJECT_NOT_FOUND");
  if (project.userId !== input.ownerId) throw new CollaboratorError("NOT_PROJECT_OWNER");

  const username = normalizeUsername(input.username);
  const invitee = username
    ? await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
        select: memberUserSelect,
      })
    : null;

  if (!invitee) throw new CollaboratorError("USER_NOT_FOUND");
  if (invitee.id === input.ownerId) throw new CollaboratorError("CANNOT_INVITE_SELF");

  const existing = await prisma.projectCollaborator.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: invitee.id } },
    select: { status: true },
  });

  if (existing) {
    throw new CollaboratorError(
      existing.status === "ACCEPTED" ? "ALREADY_MEMBER" : "ALREADY_INVITED"
    );
  }

  const collaboratorCount = await prisma.projectCollaborator.count({
    where: { projectId: project.id },
  });

  if (collaboratorCount >= MAX_COLLABORATORS_PER_PROJECT) {
    throw new CollaboratorError("TOO_MANY_COLLABORATORS");
  }

  try {
    await prisma.$transaction([
      prisma.projectCollaborator.create({
        data: {
          projectId: project.id,
          userId: invitee.id,
          invitedById: input.ownerId,
          status: "PENDING",
        },
      }),
      prisma.notification.create({
        data: {
          userId: invitee.id,
          sourceUserId: input.ownerId,
          type: "PROJECT_INVITE",
          projectId: project.id,
        },
      }),
    ]);
  } catch (error) {
    // Two concurrent invitations for the same user.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CollaboratorError("ALREADY_INVITED");
    }
    throw error;
  }

  return { user: invitee };
}

export async function respondToInvitation(input: {
  projectId: number;
  userId: number;
  accept: boolean;
}) {
  const invitation = await prisma.projectCollaborator.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
    select: { id: true, status: true, project: { select: { userId: true, visibility: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    throw new CollaboratorError("INVITATION_NOT_FOUND");
  }

  const clearInviteNotifications = prisma.notification.deleteMany({
    where: { userId: input.userId, projectId: input.projectId, type: "PROJECT_INVITE" },
  });

  if (!input.accept) {
    await prisma.$transaction([
      prisma.projectCollaborator.delete({ where: { id: invitation.id } }),
      clearInviteNotifications,
    ]);
    return { accepted: false };
  }

  // Conditional update: only a still-pending invitation can be accepted.
  const [{ count }] = await prisma.$transaction([
    prisma.projectCollaborator.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    clearInviteNotifications,
    prisma.notification.create({
      data: {
        userId: invitation.project.userId,
        sourceUserId: input.userId,
        type: "PROJECT_INVITE_ACCEPTED",
        projectId: input.projectId,
      },
    }),
  ]);

  if (count === 0) throw new CollaboratorError("INVITATION_NOT_FOUND");

  // Contribution stats are only computed for public projects (user-worker rule).
  if (invitation.project.visibility !== "private") {
    await scheduleTeamStatsRecalculation(input.projectId);
  }

  return { accepted: true };
}

/**
 * Removes a collaborator or cancels an invitation. The owner can remove anyone;
 * a collaborator can remove themselves (leave the project).
 */
export async function removeCollaborator(input: {
  projectId: number;
  actorId: number;
  userId: number;
}) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { userId: true },
  });

  if (!project) throw new CollaboratorError("PROJECT_NOT_FOUND");

  const isOwner = project.userId === input.actorId;
  const isSelf = input.actorId === input.userId;
  if (!isOwner && !isSelf) throw new CollaboratorError("NOT_PROJECT_OWNER");

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
    select: { id: true },
  });

  if (!collaborator) throw new CollaboratorError("NOT_A_MEMBER");

  await prisma.$transaction([
    prisma.projectCollaborator.delete({ where: { id: collaborator.id } }),
    // The member's contribution to this project leaves their profile with them.
    prisma.userProjectStats.deleteMany({
      where: { userId: input.userId, projectId: input.projectId },
    }),
    prisma.notification.deleteMany({
      where: { userId: input.userId, projectId: input.projectId, type: "PROJECT_INVITE" },
    }),
  ]);
}

function toStats(
  stats:
    | {
        commitsCount: number;
        linesAdded: number;
        linesDeleted: number;
        activeDays: number;
        firstCommitDate: Date | null;
        lastCommitDate: Date | null;
      }
    | undefined
): TeamMemberStats | null {
  if (!stats) return null;
  return {
    commitsCount: stats.commitsCount,
    linesAdded: stats.linesAdded,
    linesDeleted: stats.linesDeleted,
    activeDays: stats.activeDays,
    firstCommitDate: stats.firstCommitDate?.toISOString() ?? null,
    lastCommitDate: stats.lastCommitDate?.toISOString() ?? null,
  };
}

/** Team of a project, as seen by `viewerId`. Callers must check project access first. */
export async function getProjectTeam(input: {
  projectId: number;
  viewerId: number | null;
}): Promise<ProjectTeam> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: {
      userId: true,
      user: { select: memberUserSelect },
      collaborators: {
        orderBy: { createdAt: "asc" },
        select: { status: true, createdAt: true, user: { select: memberUserSelect } },
      },
      userStats: {
        select: {
          userId: true,
          commitsCount: true,
          linesAdded: true,
          linesDeleted: true,
          activeDays: true,
          firstCommitDate: true,
          lastCommitDate: true,
        },
      },
    },
  });

  if (!project) throw new CollaboratorError("PROJECT_NOT_FOUND");

  const statsByUser = new Map(project.userStats.map((s) => [s.userId, s]));
  const viewerCollaboration = project.collaborators.find((c) => c.user.id === input.viewerId);

  const viewerRole: ProjectTeam["viewerRole"] =
    input.viewerId !== null && project.userId === input.viewerId
      ? "owner"
      : viewerCollaboration?.status === "ACCEPTED"
        ? "collaborator"
        : viewerCollaboration?.status === "PENDING"
          ? "invited"
          : "none";

  const members: TeamMember[] = [
    { user: project.user, role: "owner", stats: toStats(statsByUser.get(project.userId)) },
    ...project.collaborators
      .filter((c) => c.status === "ACCEPTED")
      .map((c) => ({
        user: c.user,
        role: "collaborator" as const,
        stats: toStats(statsByUser.get(c.user.id)),
      })),
  ];

  const pendingInvitations =
    viewerRole === "owner"
      ? project.collaborators
          .filter((c) => c.status === "PENDING")
          .map((c) => ({ user: c.user, invitedAt: c.createdAt.toISOString() }))
      : [];

  return {
    viewerId: input.viewerId,
    viewerRole,
    members,
    pendingInvitations,
    maxCollaborators: MAX_COLLABORATORS_PER_PROJECT,
  };
}
