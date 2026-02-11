import { User, Project, Tag, Certification, Participation } from "@prisma/client";
import { PublicProfileDTO } from "../dtos/public-profile.dto";
import { Prisma } from "@prisma/client";

const userWithProfileData = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    projects: { include: { tags: true, repository: true } },
    certifications: { include: { tags: true } },
    participations: { include: { tags: true } },
    educations: true,
    _count: {
      select: {
        followers: true,
        following: true,
        projects: true,
      },
    },
    followers: true,
    userStats: true,
    githubStats: true,
  },
});

type UserWithProfileData = Prisma.UserGetPayload<typeof userWithProfileData>;

type LastCommitDTO = { message: string; date: string; repo: string } | null;

function normalizeLastCommit(value: unknown): LastCommitDTO {
  if (!value || typeof value !== "object") return null;
  const v = value as any;

  if (typeof v.message === "string" && typeof v.date === "string" && typeof v.repo === "string") {
    return { message: v.message, date: v.date, repo: v.repo };
  }
  return null;
}

export function mapUserToPublicProfile(
  user: UserWithProfileData,
  currentUserId?: number,
  projectsPage: number = 1,
  projectsLimit: number = 12
): PublicProfileDTO {
  const isFollowing = user.followers && user.followers.length > 0;

  return {
    id: user.id,
    username: user.username ?? "",
    email: user.contactEmail ?? null, // Uses contactEmail field, not account email
    phone: user.phone || null,
    name: user.name,
    title: user.title,
    bio: user.bio,
    longBio: user.longBio ?? null,
    skills: user.skills || [],
    image: user.image,
    cover: user.cover,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    websiteUrl: user.websiteUrl,
    createdAt: user.createdAt.toISOString(),
    followersCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing: isFollowing,

    educations: (user.educations || []).map((edu) => ({
      id: edu.id,
      degree: edu.degree,
      institution: edu.institution,
      startDate: edu.startDate.toISOString(),
      endDate: edu.endDate?.toISOString() ?? null,
    })),

    projects: user.projects.map((project: any) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      images: project.images,
      createdAt: project.createdAt.toISOString(),

      likes: project._count?.likes ?? 0,
      views: project.views ?? 0,
      hasLiked: project.likes && project.likes.length > 0,

      tags: project.tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
      })),

      ownerName: user.name ?? user.username ?? "",
      ownerUsername: user.username ?? "",
      ownerImage: user.image,
      ownerId: user.id,
      isFollowingOwner: isFollowing,

      repositoryUrl: project.repository?.url,
      repositoryFullName: project.repository?.fullName,
      repositoryIsPrivate: project.repository?.private ?? false,

      isPinned: project.isPinned,
    })),

    certifications: user.certifications.map((certification) => ({
      id: certification.id,
      title: certification.title,

      issuer: certification.issuer,
      link: certification.credentialUrl,
      image: certification.image,

      date: certification.issuedAt.getFullYear().toString(),

      tags: certification.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    })),
    participations: user.participations.map((part) => {
      // formatando a data p ficar assim "jul. 2024"
      const date = new Date(part.createdAt);
      const formattedDate = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

      // logica do role - pega a primeira tag (se existir) para usar no badge
      const role = part.tags.length > 0 ? part.tags[0].name : null;

      return {
        id: part.id,
        title: part.title,
        description: part.description,

        // pega a primeira imagem do array ou null
        image: part.images.length > 0 ? part.images[0] : null,

        date: formattedDate,
        role: role,
      };
    }),
    stats: {
      commits: user.userStats.reduce((acc, curr) => acc + curr.commitsCount, 0),
      linesAdded: user.userStats.reduce((acc, curr) => acc + curr.linesAdded, 0),
      linesDeleted: user.userStats.reduce((acc, curr) => acc + curr.linesDeleted, 0),
      activeDays: user.userStats.reduce((acc, curr) => acc + curr.activeDays, 0),
      projectsCount: user._count.projects, // Use the total count from DB
      lastCommitFetchedAt: user.githubStats?.lastCommitFetchedAt || null,
      lastCommit: normalizeLastCommit(user.githubStats?.lastCommit),
    },
    projectsMetadata: {
      total: user._count.projects,
      page: projectsPage,
      limit: projectsLimit,
      totalPages: Math.ceil(user._count.projects / projectsLimit),
    },
  };
}
