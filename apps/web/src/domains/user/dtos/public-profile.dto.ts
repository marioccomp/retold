import { ProjectCardDTO } from "../../profile/dtos/project-card.dto";
import { CertificationCardDTO } from "../../profile/dtos/certification-card.dto";
import { ParticipationCardDTO } from "../../profile/dtos/participation-card.dto";

export type PublicProfileDTO = {
  id: number;
  username: string;
  name: string | null;
  title: string | null;
  bio: string | null;
  image: string | null;
  createdAt: string;
  projects: ProjectCardDTO[];
  certifications: CertificationCardDTO[];
  participations: ParticipationCardDTO[];
};
