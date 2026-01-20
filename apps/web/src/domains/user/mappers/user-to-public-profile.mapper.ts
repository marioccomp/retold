import { User, Project, Tag, Certification, Participation } from "@prisma/client";
import { PublicProfileDTO } from "../dtos/public-profile.dto";
import { Prisma } from "@prisma/client";

const userWithProfileData = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    projects: { include: { tags: true, repository: true } },
    certifications: { include: { tags: true } },
    participations: { include: { tags: true } },
    educations: true,
  },
});

type UserWithProfileData = Prisma.UserGetPayload<typeof userWithProfileData>;

export function mapUserToPublicProfile(user: UserWithProfileData): PublicProfileDTO {
  return {
    id: user.id,
    username: user.username ?? "",
    email: user.email,
    name: user.name,
    title: user.title,
    bio: user.bio,
    longBio: user.longBio ?? null,
    skills: user.skills || [],
    image: user.image,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    websiteUrl: user.websiteUrl,
    createdAt: user.createdAt.toISOString(),

    educations: (user.educations || []).map((edu) => ({
      id: edu.id,
      degree: edu.degree,
      institution: edu.institution,
      startDate: edu.startDate.toISOString(),
      endDate: edu.endDate?.toISOString() ?? null,
    })),

    projects: user.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      images: project.images,

      createdAt: project.createdAt.toISOString(),

      // tem q implementar
      likes: 0,
      views: 0,

      tags: project.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),

      ownerName: user.name ?? user.username ?? "",
      ownerUsername: user.username ?? "",
      ownerImage: user.image,

      repositoryUrl: project.repository?.url,
      repositoryFullName: project.repository?.fullName,

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
  };
}
