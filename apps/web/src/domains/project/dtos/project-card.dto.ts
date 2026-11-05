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
  featuredTagIds: number[];

  likes: number;
  views: number;
  commentsCount: number;
  hasLiked?: boolean;

  tags: ProjectCardTagDTO[];

  createdAt: string;

  ownerName: string;
  ownerImage: string | null;
  ownerUsername: string;
  ownerId: number;
  isFollowingOwner?: boolean;
  /** True when the profile user is a collaborator (not the owner) of this project. */
  isCollaboration?: boolean;

  repositoryUrl?: string;
  repositoryFullName?: string;
  repositoryIsPrivate?: boolean;

  isPinned?: boolean;
  userOwnership?: number; // % contribution
}
