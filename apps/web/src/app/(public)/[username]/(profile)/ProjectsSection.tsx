"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./projects.module.css";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { CreateProjectPanel } from "@/src/components/CreateProjectModal";
import { ProjectOverlay } from "@/src/components/ProjectOverlay";
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
  title: string;
  description: string | null;
  status: string;
  repository: null;
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
      title: project.title,
      description: project.description,
      status: "PENDING", // Status será buscado pelo overlay via action
      repository: null, // Repository será buscado pelo overlay via action
    });
  };

  const handleOverlayClose = () => {
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
          onClick={() => handleProjectClick(project)}
        />
      ))}

      {selectedProject && (
        <ProjectOverlay
          project={selectedProject}
          onClose={handleOverlayClose}
        />
      )}
    </>
  );
}

