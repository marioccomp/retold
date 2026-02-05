"use client";

import { useState } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSearch } from "@/src/providers/SearchContext";

import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";


type Props = {
    projects: ProjectCardDTO[];
};

export default function FeedProjectsGrid({ projects }: { projects: ProjectCardDTO[] }) {
    const { debouncedSearchQuery } = useSearch();
    const { dict } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const selectedProjectId = searchParams.get("project");

    // Find project data based on URL param
    const projectData = selectedProjectId ? projects.find(p => String(p.id) === selectedProjectId) : null;

    // Transform to overlay format if found
    const selectedProject: ProjectForOverlay | null = projectData ? {
        id: projectData.id,
        userId: undefined,
        title: projectData.title,
        description: projectData.description,
        status: projectData.status,
        images: projectData.images,
        owner: {
            name: projectData.ownerName,
            image: projectData.ownerImage,
            username: projectData.ownerUsername
        },
        repository: projectData.repositoryUrl ? {
            id: 0,
            url: projectData.repositoryUrl,
            fullName: projectData.repositoryFullName || "",
            name: projectData.repositoryFullName?.split("/")[1] || "",
            isActive: true,
            private: projectData.repositoryIsPrivate ?? false,
        } : null,
    } : null;

    const filteredProjects = projects.filter(
        (project) =>
            project.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            project.tags.some((tag) => tag.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    );

    const handleProjectClick = (project: ProjectCardDTO) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("project", String(project.id));
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleProjectClose = () => {
        router.back();
        // Pequeno delay para garantir que a navegação do back() processe antes do refresh
        setTimeout(() => router.refresh(), 100);
    };

    // Se um projeto está selecionado, mostrar o painel do projeto
    if (selectedProject) {
        return (
            <div className="col-span-full flex flex-col gap-6 animate-[slideIn_0.3s_ease-out] max-w-[1400px] mx-auto w-full">
                <div className="sticky top-16 z-40 pt-4 pb-2 mb-2 bg-white/40 backdrop-blur-sm -mx-4 px-4 md:-mx-0 md:px-0">
                    <button
                        className="cursor-pointer inline-flex items-center gap-2.5 text-sm font-semibold text-gray-400 hover:text-[#05dc7f] transition-all duration-300 group bg-white/80 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md hover:border-[#05dc7f]/30"
                        onClick={handleProjectClose}
                    >
                        <FiArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
                        <span className="tracking-tight">{dict.feed.feedprojectsgrid.back_to_projects}</span>
                    </button>
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
            <div className="col-span-full flex flex-col items-center justify-center min-h-[500px] py-16 text-center">
                <p className="text-[#6b7c7a] text-lg font-medium">{dict.feed.feedprojectsgrid.no_projects.title}</p>
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
