"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { CreateProjectPanel, CreateProjectModal } from "@/src/components/CreateProjectModal";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { PaginationControls } from "@/src/components/ui/pagination-controls";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { useTranslation } from "@/src/i18n/client";
import ProjectDetailsModal from "./components/modals/ProjectDetailsModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  searchQuery: string;
  onPageChange?: (page: number) => void;
  sort?: "newest" | "oldest" | "popular";
};

export default function ProjectsSection({
  searchQuery,
  ownProfile,
  profile,
  onPageChange,
  sort,
}: Props) {
  const { dict } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Projects are already filtered and paginated from the backend
  const projects = profile.projects;
  const metadata = profile.projectsMetadata;

  const currentTab = searchParams.get("tab") || "profile";
  // Only consider project selection when on the projects tab
  const selectedProjectId = currentTab === "projects" ? searchParams.get("project") : null;

  // Find project data based on URL param
  const projectData = selectedProjectId
    ? projects.find((p) => String(p.id) === selectedProjectId)
    : null;

  // Transform to overlay format if found
  const selectedProject: ProjectForOverlay | null = projectData
    ? {
        id: projectData.id,
        userId: profile.id,
        title: projectData.title,
        description: projectData.description,
        status: projectData.status,
        visibility: projectData.visibility,
        images: projectData.images,
        featuredTagIds: projectData.featuredTagIds,
        tags: projectData.tags,
        commentsCount: projectData.commentsCount,
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
        owner: {
          username: profile.username,
          name: profile.name || profile.username,
          image: profile.image || null,
        },
      }
    : null;

  // Use projects directly, no need to filter on client side as backend handles it
  const filteredProjects = projects;

  const handleNewProject = () => {
    setIsCreating(true);
  };

  const handlePanelClose = () => {
    setIsCreating(false);
  };

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
    queryClient.invalidateQueries({ queryKey: ["github-stats", profile.username] });
    setIsCreating(false);
  };

  const handleProjectClick = (project: ProjectCardDTO) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", String(project.id));
    // Use scroll: false to prevent jumping to top if possible, though FeedProjectPanel is an overlay
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleProjectClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("project");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Se um projeto está selecionado e estamos na aba correta
  // O modal é renderizado no final do componente com isOpen={!!selectedProject}

  // If isCreating, the modal will be rendered below

  return (
    <>
      {/* Projects Grid */}

      {ownProfile && searchQuery === "" && (
        <Button
          variant="ghost"
          className="w-full min-h-[240px] h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border rounded-xl bg-muted text-muted-foreground cursor-pointer transition-all duration-200 hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-[3px] whitespace-normal"
          onClick={handleNewProject}
        >
          <FiPlus className="w-9 h-9 stroke-[1.5px]" />
          <span className="font-semibold text-[1.1rem]">{dict.profile.new_project}</span>
        </Button>
      )}

      {filteredProjects.length > 0
        ? filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              ownProfile={ownProfile}
              onClick={() => handleProjectClick(project)}
              disableHover={ownProfile ? false : false} // Allow hover on profile projects
              disableConfig={!ownProfile} // Only show config if it's own profile
            />
          ))
        : // Se já não houver o botão de "Novo projeto" (que ocupa uma vaga no grid)
          // e a lista estiver vazia, mostramos o aviso
          !(ownProfile && searchQuery === "") && (
            <div className="col-span-full py-8">
              <Card className="border-dashed border-2 bg-muted border-border">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                    <FiPlus className="w-8 h-8 text-muted-foreground rotate-45" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {searchQuery !== ""
                      ? dict.profile.no_search_results.title
                      : dict.profile.no_projects_found.title}
                  </h3>
                  <p className="text-muted-foreground max-w-[300px] leading-relaxed">
                    {searchQuery !== ""
                      ? dict.profile.no_search_results.description
                      : dict.profile.no_projects_found.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

      {/* Pagination Controls */}
      {metadata && metadata.totalPages > 1 && onPageChange && (
        <div className="col-span-full">
          <PaginationControls
            currentPage={metadata.page}
            totalPages={metadata.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      <ProjectDetailsModal
        isOpen={!!selectedProject}
        onClose={handleProjectClose}
        project={selectedProject}
      />

      <CreateProjectModal
        isOpen={isCreating}
        onClose={handlePanelClose}
        onSuccess={handleProjectCreated}
      />
    </>
  );
}
