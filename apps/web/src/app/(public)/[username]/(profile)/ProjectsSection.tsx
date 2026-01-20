"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import ProjectCard from "@/src/components/ProjectCard";
import { CreateProjectPanel } from "@/src/components/CreateProjectModal";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { useTranslation } from "@/src/i18n/client";

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
  images: string[];
};

export default function ProjectsSection({ searchQuery, ownProfile, profile }: Props) {
  const { dict } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const projects = profile.projects;
  const selectedProjectId = searchParams.get("project");

  // Find project data based on URL param
  const projectData = selectedProjectId ? projects.find(p => String(p.id) === selectedProjectId) : null;

  // Transform to overlay format if found
  const selectedProject: ProjectForOverlay | null = projectData ? {
    id: projectData.id,
    userId: profile.id,
    title: projectData.title,
    description: projectData.description,
    status: "PENDING",
    images: projectData.images, // Pass images directly
    repository: projectData.repositoryUrl ? {
      id: 0,
      url: projectData.repositoryUrl,
      fullName: projectData.repositoryFullName || "",
      name: projectData.repositoryFullName?.split("/")[1] || "",
      isActive: true
    } : null,
  } : null;

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
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", String(project.id));
    // Use scroll: false to prevent jumping to top if possible, though FeedProjectPanel is an overlay
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleProjectClose = () => {
    router.back();
  };

  // Se está criando, mostrar apenas o painel de criação
  if (isCreating) {
    return (
      <div className="col-span-full flex flex-col gap-6 animate-[slideIn_0.3s_ease-out]">
        <Button
          variant="ghost"
          className="cursor-pointer inline-flex items-center gap-2 py-2 text-[0.95rem] font-medium text-[#6b7c7a] hover:bg-transparent hover:text-[#05dc7f] w-fit group p-0 h-auto"
          onClick={handlePanelClose}
        >
          <FiArrowLeft size={18} className=" transition-transform duration-200 group-hover:-translate-x-[3px]" />
          <span>{dict.profile.back_to_projects}</span>
        </Button>
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
      <div className="col-span-full flex flex-col gap-6 animate-[slideIn_0.3s_ease-out]">
        <Button
          variant="ghost"
          className="cursor-pointer inline-flex items-center gap-2 py-2 text-[0.95rem] font-medium text-[#6b7c7a] hover:bg-transparent hover:text-[#05dc7f] w-fit group p-0 h-auto"
          onClick={handleProjectClose}
        >
          <FiArrowLeft size={18} className="transition-transform duration-200 group-hover:-translate-x-[3px]" />
          <span>{dict.profile.back_to_projects}</span>
        </Button>
        <FeedProjectPanel
          project={selectedProject}
          onClose={handleProjectClose}
        />
      </div>
    );
  }

  return (
    <>
      {ownProfile && searchQuery === "" && (
        <Button
          variant="ghost"
          className="w-full min-h-[240px] h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[#e7eae9] rounded-xl bg-[#fafafa] text-[#6b7c7a] cursor-pointer transition-all duration-200 hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[rgba(5,220,127,0.04)] hover:-translate-y-[3px] whitespace-normal"
          onClick={handleNewProject}
        >
          <FiPlus className="w-9 h-9 stroke-[1.5px]" />
          <span className="font-semibold text-[1.1rem]">{dict.profile.new_project}</span>
        </Button>
      )}

      {filteredProjects.length > 0 ? (
        filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            ownProfile={ownProfile}
            onClick={() => handleProjectClick(project)}
          />
        ))
      ) : (
        // Se já não houver o botão de "Novo projeto" (que ocupa uma vaga no grid)
        // e a lista estiver vazia, mostramos o aviso
        !(ownProfile && searchQuery === "") && (
          <div className="col-span-full py-8">
            <Card className="border-dashed border-2 bg-[#fafafa] border-[#e7eae9]">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#f3f6f5] flex items-center justify-center mb-2">
                  <FiPlus className="w-8 h-8 text-[#a0aaa8] rotate-45" />
                </div>
                <h3 className="text-xl font-bold text-[#152e2b]">
                  {dict.profile.no_projects_found.title}
                </h3>
                <p className="text-[#6b7c7a] max-w-[300px] leading-relaxed">
                  {dict.profile.no_projects_found.description}
                </p>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </>
  );
}
