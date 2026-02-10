"use client";

import { useState } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import ProjectDetailsModal from "@/src/app/(public)/[username]/(profile)/components/modals/ProjectDetailsModal";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSearch } from "@/src/providers/SearchContext";
import { useQueryClient } from "@tanstack/react-query";

import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";

import { cn } from "@/lib/utils";
import { PaginationControls } from "@/src/components/ui/pagination-controls";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Props = {
  projects: ProjectCardDTO[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

export default function FeedProjectsGrid({
  projects,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: Props) {
  const { debouncedSearchQuery } = useSearch();
  const { dict } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedProjectId = searchParams.get("project");

  // Find project data based on URL param
  const projectData = selectedProjectId
    ? projects.find((p) => String(p.id) === selectedProjectId)
    : null;

  // Transform to overlay format if found
  const selectedProject: ProjectForOverlay | null = projectData
    ? {
        id: projectData.id,
        userId: undefined,
        title: projectData.title,
        description: projectData.description,
        status: projectData.status,
        images: projectData.images,
        owner: {
          name: projectData.ownerName,
          image: projectData.ownerImage,
          username: projectData.ownerUsername,
        },
        repository: projectData.repositoryUrl
          ? {
              id: 0,
              url: projectData.repositoryUrl,
              fullName: projectData.repositoryFullName || "",
              name: projectData.repositoryFullName?.split("/")[1] || "",
              isActive: true,
              private: projectData.repositoryIsPrivate ?? false,
            }
          : null,
      }
    : null;

  // Use projects directly, as they are already filtered by the backend
  const filteredProjects = projects;

  const handleProjectClick = (project: ProjectCardDTO) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", String(project.id));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const queryClient = useQueryClient();

  const handleProjectClose = () => {
    router.back();
    queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
  };

  if (filteredProjects.length === 0) {
    return (
      <>
        <div className="col-span-full flex flex-col items-center justify-center min-h-[500px] py-16 text-center">
          <p className="text-[#6b7c7a] text-lg font-medium">
            {dict.feed.feedprojectsgrid.no_projects.title}
          </p>
          <p className="text-[#a0aaa8] text-sm mt-1">
            {dict.feed.feedprojectsgrid.no_projects.description}
          </p>
        </div>
        <ProjectDetailsModal
          isOpen={!!selectedProject}
          onClose={handleProjectClose}
          project={selectedProject}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project)}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}

      <ProjectDetailsModal
        isOpen={!!selectedProject}
        onClose={handleProjectClose}
        project={selectedProject}
      />
    </div>
  );
}
