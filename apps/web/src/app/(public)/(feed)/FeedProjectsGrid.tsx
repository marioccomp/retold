"use client";

import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";

import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";


type Props = {
    projects: ProjectCardDTO[];
    searchQuery: string;
    onProjectSelectChange?: (isSelected: boolean) => void;
};

export default function FeedProjectsGrid({ projects, searchQuery, onProjectSelectChange }: Props) {
    const { dict } = useTranslation();
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
            owner: {
                name: project.ownerName,
                image: project.ownerImage,
                username: project.ownerUsername
            },
            repository: project.repositoryUrl ? {
                id: 0,
                url: project.repositoryUrl,
                fullName: project.repositoryFullName || "",
                name: project.repositoryFullName?.split("/")[1] || "",
                isActive: true
            } : null,
        });
        onProjectSelectChange?.(true);
    };

    const handleProjectClose = () => {
        setSelectedProject(null);
        onProjectSelectChange?.(false);
    };

    // Se um projeto está selecionado, mostrar o painel do projeto
    if (selectedProject) {
        return (
            <div className="col-span-full flex flex-col gap-6 animate-[slideIn_0.3s_ease-out] max-w-[1400px] mx-auto w-full">
                <div className="sticky top-16 z-40 bg-gradient-to-b from-[#fafdf8] to-white/95 backdrop-blur-lg pt-4 pb-4 -mx-6 px-6 md:-mx-12 md:px-12 border-b border-[#d4e5d7] mb-4 flex items-center w-[calc(100%+48px)] md:w-[calc(100%+96px)] shadow-sm">
                    <Button
                        variant="ghost"
                        className="cursor-pointer inline-flex items-center gap-2 py-2 text-[0.95rem] font-medium text-[#6b7c7a] hover:bg-transparent hover:text-[#05dc7f] w-fit group p-0 h-auto"
                        onClick={handleProjectClose}
                    >
                        <FiArrowLeft size={18} className="transition-transform duration-200 group-hover:-translate-x-[3px]" />
                        <span>{dict.feed.feedprojectsgrid.back_to_projects}</span>
                    </Button>
                </div>

                <FeedProjectPanel
                    project={selectedProject}
                    onClose={handleProjectClose}
                />
            </div>
        );
    }

    if (filteredProjects.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[#6b7c7a] text-lg">{dict.feed.feedprojectsgrid.no_projects.title}</p>
                <p className="text-[#a0aaa8] text-sm mt-1">{dict.feed.feedprojectsgrid.no_projects.description}</p>
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
