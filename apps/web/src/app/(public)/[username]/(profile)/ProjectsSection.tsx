"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./projects.module.css";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { CreateProjectPanel } from "@/src/components/CreateProjectModal";
import { ProjectPanel } from "@/src/components/ProjectOverlay";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { ProjectCardDTO } from "@/src/domains/profile/dtos/project-card.dto";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  searchQuery: string;
};

// Tipo adaptado para o overlay (campos mínimos necessários)
type ProjectForOverlay = {
  id: number;
  userId?: number;
  title: string;
  description: string | null;
  status: string;
  repository: any;
};

export default function ProjectsSection({ searchQuery, ownProfile, profile }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectForOverlay | null>(null);
  const queryClient = useQueryClient();

  const projects = profile.projects;

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNewProject = () => {
    setIsCreating(true);
  };

  const handlePanelClose = () => {
    setIsCreating(false);
  };

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
    setIsCreating(false);
  };

  const handleProjectClick = (project: ProjectCardDTO) => {
    // Adaptar ProjectCardDTO para o tipo mínimo que o overlay precisa
    setSelectedProject({
      id: project.id,
      userId: profile.id, // O dono dos projetos listados é o dono do perfil
      title: project.title,
      description: project.description,
      status: "PENDING", // Status será buscado pelo overlay via action
      repository: project.repositoryUrl ? {
        id: 0, // Mock ID or add to DTO if strictly needed
        url: project.repositoryUrl,
        fullName: project.repositoryFullName || "",
        name: project.repositoryFullName?.split("/")[1] || "",
        isActive: true
      } : null,
    });
  };

  const handleProjectClose = () => {
    setSelectedProject(null);
  };

  // Se está criando, mostrar apenas o painel de criação
  if (isCreating) {
    return (
      <div className={styles.createPanelWrapper}>
        <button className={styles.backButton} onClick={handlePanelClose}>
          <FiArrowLeft size={18} />
          <span>Voltar aos projetos</span>
        </button>
        <CreateProjectPanel
          onClose={handlePanelClose}
          onSuccess={handleProjectCreated}
        />
      </div>
    );
  }

  // Se um projeto está selecionado, mostrar o painel do projeto
  if (selectedProject) {
    return (
      <div className={styles.createPanelWrapper}>
        <button className={styles.backButton} onClick={handleProjectClose}>
          <FiArrowLeft size={18} />
          <span>Voltar aos projetos</span>
        </button>
        <ProjectPanel
          project={selectedProject}
          onClose={handleProjectClose}
        />
      </div>
    );
  }

  return (
    <>
      {ownProfile && searchQuery === "" && (
        <div
          className={styles.newProjectCard}
          onClick={handleNewProject}
          onKeyDown={(e) => e.key === "Enter" && handleNewProject()}
          role="button"
          tabIndex={0}
        >
          <FiPlus className={styles.newProjectIcon} />
          <span className={styles.newProjectText}>Novo projeto</span>
        </div>
      )}

      {filteredProjects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          ownProfile={ownProfile}
          onClick={() => handleProjectClick(project)}
        />
      ))}
    </>
  );
}
