"use client";

import styles from "./projects.module.css";
import { FiPlus } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";

export default function ProjectsSection({ searchQuery }: { searchQuery: string }) {
  const projects = [
    {
      id: 1,
      title: "Simulador de Escalonamento",
      description: "Comparativo de desempenho entre algoritmos de CPU.",
      tags: ["Julia", "Algorithms"],
    },
    {
      id: 2,
      title: "Sistema Solar 3D",
      description: "Simulação física vetorial utilizando GLMakie.",
      tags: ["Julia", "Physics"],
    },
  ];

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNewProject = () => {
    console.log("Abrir modal de novo projeto");
  };

  return (
    <>
      {searchQuery === "" && (
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
