export interface ProjectCardTagDTO {
  name: string;
  id: number;
}

export interface ProjectCardDTO {
  id: number;
  title: string;
  description: string | null;
  status: string;
  images: string[];
  likes: number;
  views: number;
  tags: ProjectCardTagDTO[];
  createdAt: string;

  ownerName: string;
  ownerImage: string | null;
  ownerUsername: string;

  repositoryUrl?: string;
  repositoryFullName?: string;

  isPinned?: boolean;
}
