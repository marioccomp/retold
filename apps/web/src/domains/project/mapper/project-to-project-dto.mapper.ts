import { Project } from "@prisma/client";
import { ProjectCardDTO, ProjectCardTagDTO } from "../dtos/project-card.dto";

// ele n ta reconhecendo project, likes e views por ser de include do prisma, faz tipo um DTO de project com isso aq em baixo

interface ProjectRequestDTO {
  project: Project;
  user: {
    id: number;
    name: string;
    image: string;
    username: string;
  };
  repository: {
    url: string;
    fullName: string;
    private?: boolean;
  };
  tags: ProjectCardTagDTO[];
  likes: number;
  views: number;
  commentsCount: number;
  hasLiked?: boolean;
  isFollowingOwner?: boolean;
}

export function mapProjectToProjectDTO(request: ProjectRequestDTO): ProjectCardDTO {
  const { project, user, repository, tags, likes, views, commentsCount, hasLiked, isFollowingOwner } = request;
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    images: project.images,
    likes: likes,
    views: views,
    commentsCount: commentsCount,
    hasLiked: hasLiked,
    tags: tags,
    createdAt: project.createdAt.toISOString(),
    ownerName: user.name,
    ownerImage: user.image,
    ownerUsername: user.username,
    ownerId: user.id,
    repositoryUrl: repository?.url,
    repositoryFullName: repository?.fullName,
    repositoryIsPrivate: repository?.private,
    isFollowingOwner: isFollowingOwner ?? false,
  };
}
