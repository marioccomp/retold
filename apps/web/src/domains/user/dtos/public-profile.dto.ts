import { ProjectCardDTO } from "../../project/dtos/project-card.dto";
import { CertificationCardDTO } from "../../profile/dtos/certification-card.dto";
import { ParticipationCardDTO } from "../../profile/dtos/participation-card.dto";

export type EducationDTO = {
  id: number;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string | null;
}

export type PublicProfileDTO = {
  id: number;
  username: string;
  email: string | null;
  name: string | null;
  title: string | null;
  bio: string | null;
  longBio: string | null;
  skills: string[];
  image: string | null;
  cover: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  projects: ProjectCardDTO[];
  certifications: CertificationCardDTO[];
  participations: ParticipationCardDTO[];
  educations: EducationDTO[];
};
