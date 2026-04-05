import { prisma } from "@repo/database";
import { Prisma } from "@prisma/client";
import type { NotificationType, Plan, ProjectStatus, Role } from "@prisma/client";

let uniqueGithubId =
  Math.floor(Date.now() / 1_000) + Math.floor(Math.random() * 10_000);

function nextGithubId() {
  uniqueGithubId += 1;
  return uniqueGithubId;
}

function isGithubIdCollision(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("githubId")
  );
}

export function createIntegrationRunId(prefix = "it") {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

export function buildIntegrationEmail(runId: string, label: string) {
  return `integration+${runId}-${label}@example.com`;
}

type CreateUserInput = {
  label: string;
  email?: string;
  username?: string | null;
  password?: string | null;
  role?: Role;
  plan?: Plan;
  hasCompletedOnboarding?: boolean;
};

export async function createIntegrationUser(runId: string, input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: input.email ?? buildIntegrationEmail(runId, input.label),
      username: input.username ?? `${runId}_${input.label}`.slice(0, 20),
      password: input.password ?? "hashed-password",
      name: `${input.label} user`,
      role: input.role ?? "USER",
      plan: input.plan ?? "FREE",
      hasCompletedOnboarding: input.hasCompletedOnboarding ?? true,
    },
  });
}

type CreateRepositoryInput = {
  userId: number;
  label: string;
  isActive?: boolean;
  private?: boolean;
};

export async function createIntegrationRepository(
  runId: string,
  input: CreateRepositoryInput
) {
  const repoName = `${runId}-${input.label}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.repository.create({
        data: {
          githubId: nextGithubId(),
          name: repoName,
          fullName: `integration/${repoName}`,
          url: `https://github.com/integration/${repoName}`,
          private: input.private ?? false,
          isActive: input.isActive ?? true,
          userId: input.userId,
        },
      });
    } catch (error) {
      if (isGithubIdCollision(error) && attempt < 4) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to create integration repository with a unique githubId");
}

type CreateProjectInput = {
  userId: number;
  repositoryId?: number | null;
  label: string;
  visibility?: "public" | "private";
  status?: ProjectStatus;
};

export async function createIntegrationProject(runId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      title: `${runId}-${input.label}`,
      description: `Description for ${input.label}`,
      longerDescription: `Long description for ${input.label}`,
      images: [],
      featuredTagIds: [],
      userId: input.userId,
      repositoryId: input.repositoryId ?? null,
      visibility: input.visibility ?? "public",
      status: input.status ?? "PENDING",
    },
  });
}

type CreateNotificationInput = {
  userId: number;
  sourceUserId: number;
  type: NotificationType;
  projectId?: number | null;
  commentId?: number | null;
  read?: boolean;
};

export async function createIntegrationNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      sourceUserId: input.sourceUserId,
      type: input.type,
      projectId: input.projectId ?? null,
      commentId: input.commentId ?? null,
      read: input.read ?? false,
    },
  });
}

export async function cleanupIntegrationRun(runId: string) {
  const emailPrefix = `integration+${runId}-`;
  const users = await prisma.user.findMany({
    where: {
      email: {
        startsWith: emailPrefix,
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  const userIds = users.map((user) => user.id);

  const repositories = await prisma.repository.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
    select: {
      id: true,
    },
  });
  const repositoryIds = repositories.map((repository) => repository.id);

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        {
          userId: {
            in: userIds,
          },
        },
        {
          repositoryId: {
            in: repositoryIds,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
  const projectIds = projects.map((project) => project.id);

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { sourceUserId: { in: userIds } },
          { projectId: { in: projectIds } },
        ],
      },
    });

    await tx.comment.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { projectId: { in: projectIds } },
        ],
      },
    });

    await tx.like.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { projectId: { in: projectIds } },
        ],
      },
    });

    await tx.projectView.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { projectId: { in: projectIds } },
        ],
      },
    });

    await tx.userProjectStats.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { projectId: { in: projectIds } },
        ],
      },
    });

    await tx.repositoryAnalysis.deleteMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
    });

    await tx.follows.deleteMany({
      where: {
        OR: [
          { followerId: { in: userIds } },
          { followingId: { in: userIds } },
        ],
      },
    });

    await tx.education.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.certification.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.participation.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.githubStats.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.githubAppInstallation.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.passwordResetToken.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.session.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.account.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.project.deleteMany({
      where: {
        id: {
          in: projectIds,
        },
      },
    });

    await tx.repository.deleteMany({
      where: {
        id: {
          in: repositoryIds,
        },
      },
    });

    await tx.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
  });
}

export async function disconnectIntegrationDb() {
  await prisma.$disconnect();
}

export function buildAuthSession(user: { id: number; username?: string | null }) {
  return {
    user: {
      id: String(user.id),
      username: user.username ?? null,
    },
  };
}
