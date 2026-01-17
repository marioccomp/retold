"use client";

import { useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import ProjectCard from "@/src/components/ProjectCard";
import { ProjectPanel } from "@/src/components/ProjectOverlay";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { FaStar } from "react-icons/fa";
import { FiArrowLeft } from "react-icons/fi";
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
    projectDTO: ProjectCardDTO | null;
};

export default function FeedHeroSection({ projectDTO }: Props) {
    const [selectedProject, setSelectedProject] = useState<ProjectForOverlay | null>(null);

    const handleProjectClick = () => {
        if (!projectDTO) return;

        setSelectedProject({
            id: projectDTO.id,
            userId: undefined, // Não temos o userId no DTO, o overlay vai buscar
            title: projectDTO.title,
            description: projectDTO.description,
            status: "PENDING",
            repository: projectDTO.repositoryUrl ? {
                id: 0,
                url: projectDTO.repositoryUrl,
                fullName: projectDTO.repositoryFullName || "",
                name: projectDTO.repositoryFullName?.split("/")[1] || "",
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
            <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto px-6 py-8 animate-[slideIn_0.3s_ease-out]">
                <Button
                    variant="ghost"
                    className="cursor-pointer inline-flex items-center gap-2 py-2 text-[0.95rem] font-medium text-[#6b7c7a] hover:bg-transparent hover:text-[#05dc7f] w-fit group p-0 h-auto"
                    onClick={handleProjectClose}
                >
                    <FiArrowLeft size={18} className="transition-transform duration-200 group-hover:-translate-x-[3px]" />
                    <span>Voltar</span>
                </Button>
                <ProjectPanel
                    project={selectedProject}
                    onClose={handleProjectClose}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center">
            {/* Hero Section */}
            <Card className="py-8 px-6 md:py-12 md:px-8 lg:py-14 lg:pl-16 lg:pr-[400px] xl:pl-20 xl:pr-[460px] min-h-[280px] md:min-h-[320px] max-w-[1800px] w-full mx-4 md:mx-6 mt-4 md:mt-6 mb-8 md:mb-12 bg-gradient-to-br from-[#0a1f1c] via-[#0f3d2e] to-emerald-500 border-0 shadow-2xl overflow-visible relative rounded-xl md:rounded-2xl">

                {/* Decorative orbs */}
                <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-[#05dc7f]/8 rounded-full blur-2xl" />
                <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-teal-300/10 rounded-full blur-3xl translate-y-1/2" />

                {/* Content container */}
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

                    {/* Text content */}
                    <div className="flex flex-col gap-4 max-w-[600px]">
                        <CardTitle className="text-3xl md:text-4xl lg:text-[3.2rem] xl:text-[3.8rem] font-bold text-white leading-[1.08] tracking-tight">
                            Projetos falam mais alto que currículos.
                        </CardTitle>
                        <CardDescription className="text-base md:text-lg text-emerald-100/70 max-w-[450px] leading-relaxed">
                            O Retold é uma galeria visual onde projetos ganham contexto, narrativa e impacto
                        </CardDescription>

                        {/* CTA buttons */}
                        <div className="flex gap-3 mt-4">
                            <button className="px-6 py-3 bg-[#05dc7f] hover:bg-[#04c970] text-[#0a1f1c] font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 cursor-pointer">
                                Explorar projetos
                            </button>
                            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg border border-white/20 transition-all backdrop-blur-sm cursor-pointer">
                                Criar portfólio
                            </button>
                        </div>
                    </div>
                </div>

                {/* Highlighted Project Card */}
                {projectDTO && (
                    <div className="absolute right-4 lg:right-6 xl:right-8 bottom-0 translate-y-1/4 w-[280px] lg:w-[340px] xl:w-[380px] z-20 hidden md:block">
                        {/* Featured badge */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-lg shadow-amber-500/30">
                            <FaStar className="text-amber-900 text-sm" />
                            <span className="text-amber-900 text-xs font-bold uppercase tracking-wide">Projeto Destaque</span>
                        </div>

                        {/* Card wrapper with glow effect */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#05dc7f] to-emerald-400 rounded-xl blur-xl opacity-30 scale-105" />
                            <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-white/10">
                                <ProjectCard
                                    project={projectDTO}
                                    disableHover
                                    disableConfig
                                    onClick={handleProjectClick}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Project Card */}
                {projectDTO && (
                    <div className="md:hidden mt-8 relative">
                        <div className="flex items-center justify-center gap-1.5 mb-4">
                            <FaStar className="text-amber-400 text-sm" />
                            <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">Projeto Destaque</span>
                        </div>
                        <div className="relative max-w-[350px] mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#05dc7f] to-emerald-400 rounded-xl blur-xl opacity-20 scale-105" />
                            <div className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10">
                                <ProjectCard
                                    project={projectDTO}
                                    disableConfig
                                    onClick={handleProjectClick}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
