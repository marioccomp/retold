export interface ProjectCardTagDTO {
  id: number;
  name: string;
}

export interface ProjectCardDTO {
  id: number;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  images: string[];

  likes: number;
  views: number;
  hasLiked?: boolean;

  tags: ProjectCardTagDTO[];

  createdAt: string;

  ownerName: string;
  ownerImage: string | null;
  ownerUsername: string;
  ownerId: number;
  isFollowingOwner?: boolean;

  repositoryUrl?: string;
  repositoryFullName?: string;
  repositoryIsPrivate?: boolean;

  isPinned?: boolean;
  userOwnership?: number; // % contribution
}
