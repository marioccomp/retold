import { ProjectCardDTO } from "../../project/dtos/project-card.dto";
import { CertificationCardDTO } from "../../profile/dtos/certification-card.dto";
import { ParticipationCardDTO } from "../../profile/dtos/participation-card.dto";

export type EducationDTO = {
  id: number;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string | null;
};

export type UserStatsDTO = {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  activeDays: number;
  projectsCount: number;
  lastCommit?: {
    message: string;
    date: string;
    repo: string;
  } | null;
  lastCommitFetchedAt: Date | null;
};

export type PublicProfileDTO = {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  title: string | null;
  bio: string | null;
  longBio: string | null;
  skills: string[];
  image: string | null;
  cover: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  websiteUrl: string | null;
  createdAt: string;
  projects: ProjectCardDTO[];
  projectsMetadata?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  certifications: CertificationCardDTO[];
  participations: ParticipationCardDTO[];
  educations: EducationDTO[];

  stats: UserStatsDTO;
};
