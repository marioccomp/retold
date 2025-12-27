import { User, Project, Tag } from "@prisma/client";
import { PublicProfileDTO } from "../dtos/public-profile.dto";

type UserWithProjects = User & {
  projects: (Project & { tags: Tag[] })[];
};

export function mapUserToPublicProfile(user: UserWithProjects): PublicProfileDTO {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title,
    bio: user.bio,
    image: user.image,
    createdAt: user.createdAt,
    projects: user.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      createdAt: project.createdAt,
      tags: project.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    })),
  };
}
