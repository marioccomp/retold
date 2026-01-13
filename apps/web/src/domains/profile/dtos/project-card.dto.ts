export interface ProjectCardTagDTO {
  id: number;
  name: string;
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
}
