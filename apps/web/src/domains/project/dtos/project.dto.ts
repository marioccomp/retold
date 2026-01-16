export type ProjectDTO = {
  id: number;
  title: string;
  description: string | null;
  status: string;

  createdAt: string;
  updatedAt: string;

  repository: {
    id: number;
    name: string;
    fullName: string;
    url: string;
    isActive: boolean;
  } | null;
};
