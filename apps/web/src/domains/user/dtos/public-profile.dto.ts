export type PublicProfileDTO = {
  id: number;
  username: string;
  name: string | null;
  title: string | null;
  bio: string | null;
  image: string | null;
  createdAt: Date;
  projects: {
    id: number;
    title: string;
    description: string;
    createdAt: Date;
    tags: {
      id: number;
      name: string;
    }[];
  }[];
};
