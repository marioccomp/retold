"use client";

import styles from "./projects.module.css";
import { FiPlus } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  searchQuery: string;
};

export default function ProjectsSection({ searchQuery, ownProfile, profile }: Props) {
  // const projects = [
  //   {
  //     id: 1,
  //     title: "Simulador de Escalonamento",
  //     description: "Comparativo de desempenho entre algoritmos de CPU.",
  //     tags: [
  //       { id: 1, name: "Julia" },
  //       { id: 2, name: "GLMakie" },
  //     ],
  //   },
  //   {
  //     id: 2,
  //     title: "Sistema Solar 3D",
  //     description: "Simulação física vetorial utilizando GLMakie.",
  //     tags: [
  //       { id: 1, name: "Julia" },
  //       { id: 2, name: "GLMakie" },
  //     ],
  //   },
  // ];

  const projects = profile.projects;

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNewProject = () => {
    console.log("Abrir modal de novo projeto");
  };

  return (
    <>
      {ownProfile && searchQuery === "" && (
        <div
          className={styles.newProjectCard}
          onClick={handleNewProject}
          role="button"
          tabIndex={0}
        >
          <FiPlus className={styles.newProjectIcon} />
          <span className={styles.newProjectText}>Novo projeto</span>
        </div>
      )}

      {filteredProjects.map((project) => (
        <ProjectCard key={project.id} />
      ))}
    </>
  );
}
