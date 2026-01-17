"use client";

import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { ProjectPanel } from "@/src/components/ProjectOverlay";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Button } from "@/components/ui/button";

type ProjectForOverlay = {
    id: number;
    userId?: number;
    title: string;
    description: string | null;
    status: string;
    repository: any;
};

type Props = {
    projects: ProjectCardDTO[];
    searchQuery: string;
};

export default function FeedProjectsGrid({ projects, searchQuery }: Props) {
    const [selectedProject, setSelectedProject] = useState<ProjectForOverlay | null>(null);

    const filteredProjects = projects.filter(
        (project) =>
            project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.tags.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleProjectClick = (project: ProjectCardDTO) => {
        setSelectedProject({
            id: project.id,
            userId: undefined,
            title: project.title,
            description: project.description,
            status: "PENDING",
            repository: project.repositoryUrl ? {
                id: 0,
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

    // Se um projeto está selecionado, mostrar o painel do projeto
    if (selectedProject) {
        return (
            <div className="col-span-full flex flex-col gap-6 animate-[slideIn_0.3s_ease-out] max-w-[1000px] mx-auto w-full">
                <Button
                    variant="ghost"
                    className="cursor-pointer inline-flex items-center gap-2 py-2 text-[0.95rem] font-medium text-[#6b7c7a] hover:bg-transparent hover:text-[#05dc7f] w-fit group p-0 h-auto"
                    onClick={handleProjectClose}
                >
                    <FiArrowLeft size={18} className="transition-transform duration-200 group-hover:-translate-x-[3px]" />
                    <span>Voltar aos projetos</span>
                </Button>
                <ProjectPanel
                    project={selectedProject}
                    onClose={handleProjectClose}
                />
            </div>
        );
    }

    if (filteredProjects.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[#6b7c7a] text-lg">Nenhum projeto encontrado</p>
                <p className="text-[#a0aaa8] text-sm mt-1">Tente buscar por outro termo</p>
            </div>
        );
    }

    return (
        <>
            {filteredProjects.map((project) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project)}
                />
            ))}
        </>
    );
}
