"use client";

import { useState } from "react";
import ProjectCard from "@/src/components/ProjectCard";
import { ProjectPanel } from "@/src/components/ProjectOverlay";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { FiArrowLeft, FiArrowRight, FiStar } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function HeroSection({ projectDTO }: Props) {
    const [selectedProject, setSelectedProject] = useState<ProjectForOverlay | null>(null);

    const handleProjectClick = () => {
        if (!projectDTO) return;

        setSelectedProject({
            id: projectDTO.id,
            userId: undefined,
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
        <section className="relative w-full overflow-hidden">
            {/* Background with gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-[#f0fdf4] to-[#dcfce7]" />

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#05dc7f]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#05dc7f]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-200/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.02]">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#047857" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hero-grid)" />
                </svg>
            </div>

            {/* Main content */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-8 lg:px-12 py-16 md:py-20 lg:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    {/* Text content */}
                    <div className="flex flex-col gap-6 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#05dc7f]/10 rounded-full w-fit mx-auto lg:mx-0 border border-[#05dc7f]/20">
                            <FiStar className="text-[#05dc7f]" size={16} />
                            <span className="text-sm font-medium text-[#047857]">
                                Plataforma de portfólios criativos
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-[#152e2b] leading-[1.1] tracking-tight">
                            Seus projetos contam
                            <span className="block text-[#05dc7f]">sua história</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-[#6b7c7a] max-w-[500px] mx-auto lg:mx-0 leading-relaxed">
                            O Retold transforma seus projetos em narrativas visuais.
                            Mostre o contexto, o processo e o impacto do seu trabalho.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-2">
                            <Button
                                asChild
                                className="h-12 px-8 bg-[#05dc7f] hover:bg-[#04c370] text-[#0f2f28] font-semibold text-base rounded-xl shadow-lg shadow-[#05dc7f]/25 hover:shadow-xl hover:shadow-[#05dc7f]/30 transition-all hover:-translate-y-0.5"
                            >
                                <Link href="/register">
                                    Começar agora
                                    <FiArrowRight className="ml-2" size={18} />
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 px-8 border-2 border-[#e7eae9] hover:border-[#05dc7f] text-[#152e2b] font-medium text-base rounded-xl transition-all hover:bg-[#05dc7f]/5"
                            >
                                Explorar projetos
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-center lg:justify-start gap-8 mt-6 pt-6 border-t border-[#e7eae9]/60">
                            <div className="text-center lg:text-left">
                                <p className="text-2xl md:text-3xl font-bold text-[#152e2b]">2.5k+</p>
                                <p className="text-sm text-[#6b7c7a]">Projetos</p>
                            </div>
                            <div className="w-px h-10 bg-[#e7eae9]" />
                            <div className="text-center lg:text-left">
                                <p className="text-2xl md:text-3xl font-bold text-[#152e2b]">800+</p>
                                <p className="text-sm text-[#6b7c7a]">Criadores</p>
                            </div>
                            <div className="w-px h-10 bg-[#e7eae9]" />
                            <div className="text-center lg:text-left">
                                <p className="text-2xl md:text-3xl font-bold text-[#152e2b]">50k+</p>
                                <p className="text-sm text-[#6b7c7a]">Visualizações</p>
                            </div>
                        </div>
                    </div>

                    {/* Featured Project */}
                    <div className="flex flex-col items-center lg:items-end">
                        {projectDTO ? (
                            <div className="relative w-full max-w-[420px]">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#05dc7f]/30 to-emerald-300/30 rounded-2xl blur-2xl scale-105 opacity-60" />

                                {/* Featured badge */}
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2 bg-white rounded-full shadow-lg border border-[#05dc7f]/20">
                                    <div className="w-2 h-2 rounded-full bg-[#05dc7f] animate-pulse" />
                                    <span className="text-sm font-semibold text-[#152e2b]">Projeto em Destaque</span>
                                </div>

                                {/* Card wrapper */}
                                <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(5,220,127,0.3)] ring-1 ring-[#05dc7f]/10 bg-white">
                                    <ProjectCard
                                        project={projectDTO}
                                        disableHover
                                        disableConfig
                                        onClick={handleProjectClick}
                                    />
                                </div>

                                {/* Decorative dots */}
                                <div className="absolute -bottom-6 -right-6 w-24 h-24 opacity-20">
                                    <svg viewBox="0 0 100 100" className="w-full h-full">
                                        {[0, 1, 2, 3].map((row) =>
                                            [0, 1, 2, 3].map((col) => (
                                                <circle
                                                    key={`${row}-${col}`}
                                                    cx={15 + col * 25}
                                                    cy={15 + row * 25}
                                                    r="4"
                                                    fill="#05dc7f"
                                                />
                                            ))
                                        )}
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            // Placeholder when no featured project
                            <div className="relative w-full max-w-[420px] h-[400px] rounded-2xl bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] border-2 border-dashed border-[#05dc7f]/30 flex flex-col items-center justify-center gap-4 p-8">
                                <div className="w-16 h-16 rounded-full bg-[#05dc7f]/10 flex items-center justify-center">
                                    <FiStar className="text-[#05dc7f]" size={28} />
                                </div>
                                <p className="text-center text-[#6b7c7a]">
                                    Seja o primeiro a ter seu projeto em destaque!
                                </p>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="border-[#05dc7f] text-[#05dc7f] hover:bg-[#05dc7f]/10"
                                >
                                    <Link href="/register">Criar projeto</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
