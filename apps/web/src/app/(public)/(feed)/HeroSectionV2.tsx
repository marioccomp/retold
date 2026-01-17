"use client";

import { useState } from "react";
import ProjectCard from "@/src/components/ProjectCard";
import { ProjectPanel } from "@/src/components/ProjectOverlay";
import { CreateProjectPanel } from "@/src/components/CreateProjectModal";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { FiArrowRight, FiCheckCircle, FiPlus, FiSearch, FiTrendingUp, FiArrowLeft } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Session } from "next-auth";

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
    session: Session | null;
};

export default function HeroSectionV2({ projectDTO, session }: Props) {
    const [selectedProject, setSelectedProject] = useState<ProjectForOverlay | null>(null);
    const [isCreating, setIsCreating] = useState(false);

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

    // Overlay para criar novo projeto
    if (isCreating) {
        return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 z-10 hover:bg-black/10 rounded-full"
                        onClick={() => setIsCreating(false)}
                    >
                        <span className="text-xl">×</span>
                    </Button>
                    <div className="p-6">
                        <CreateProjectPanel
                            onClose={() => setIsCreating(false)}
                            onSuccess={() => {
                                setIsCreating(false);
                                window.location.reload();
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (selectedProject) {
        return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 z-10 hover:bg-black/10 rounded-full"
                        onClick={handleProjectClose}
                    >
                        <span className="text-xl">×</span>
                    </Button>
                    <ProjectPanel
                        project={selectedProject}
                        onClose={handleProjectClose}
                    />
                </div>
            </div>
        );
    }

    return (
        <section className="relative w-full overflow-visible bg-gradient-to-b from-white via-white to-[#f0fdf4] pb-16 lg:pb-24">
            {/* Organic background shapes - Enhanced green gradients */}
            <div className="absolute top-0 right-0 w-[60%] h-[90%] bg-gradient-to-bl from-[#c2fa11]/30 via-[#33bd19]/15 to-transparent blur-[100px] rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[50%] h-[70%] bg-gradient-to-tr from-[#c2fa11]/25 via-[#33bd19]/10 to-transparent blur-[80px] rounded-tr-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,rgba(194,250,17,0.08)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-20 lg:py-24">
                <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">

                    {/* Left Content */}
                    <div className="flex-1 flex flex-col gap-8 text-center lg:text-left">
                        {/* Removed Community Active Badge */}

                        <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold text-[#052e16] leading-[1.05] tracking-tight">
                            Dê vida ao seu <br className="hidden lg:block" />
                            <span className="relative inline-block bg-gradient-to-r from-[#33bd19] via-[#5ac82d] to-[#c2fa11] bg-clip-text text-transparent">
                                portfólio
                                {/* Underline decoration with gradient */}
                                <svg className="absolute w-full h-4 -bottom-1 left-0" viewBox="0 0 100 10" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#33bd19" />
                                            <stop offset="50%" stopColor="#7dd634" />
                                            <stop offset="100%" stopColor="#c2fa11" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M0 5 Q 50 12 100 5" stroke="url(#underlineGradient)" strokeWidth="10" fill="none" />
                                </svg>
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-[#374151] leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                            Mais que código, mostre o impacto. O lugar onde desenvolvedores constroem autoridade através de projetos reais.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-6">
                            {!session ? (
                                <Button
                                    asChild
                                    className="h-14 px-8 bg-gradient-to-r from-[#33bd19] to-[#7dd634] hover:from-[#2ca516] hover:to-[#6bc12c] text-white text-lg font-bold rounded-full shadow-lg shadow-[#33bd19]/30 hover:shadow-xl hover:shadow-[#33bd19]/40 transition-all hover:-translate-y-1 border border-[#33bd19]/20"
                                >
                                    <Link href="/register">
                                        Criar meu perfil
                                        <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    className="cursor-pointer h-14 px-8 bg-gradient-to-r from-[#33bd19] to-[#7dd634] hover:from-[#2ca516] hover:to-[#6bc12c] text-white text-lg font-bold rounded-full shadow-lg shadow-[#33bd19]/30 hover:shadow-xl hover:shadow-[#33bd19]/40 transition-all hover:-translate-y-1 border border-[#33bd19]/20"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <FiPlus className="mr-2" />
                                    Novo projeto
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                className="cursor-pointer h-14 px-8 text-[#1d6b22] hover:bg-gradient-to-r hover:from-[#c2fa11]/15 hover:to-[#33bd19]/15 text-lg font-bold rounded-full border-2 border-[#7dd634] hover:border-[#33bd19] transition-all"
                                onClick={() => document.getElementById('feed-content')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                <FiSearch className="mr-2" />
                                Explorar projetos
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-3 pt-6 text-sm font-semibold text-[#4b5563]">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-gradient-to-br from-[#c2fa11]/30 to-[#33bd19]/30">
                                    <FiCheckCircle className="text-[#33bd19]" />
                                </div>
                                <span>Portfólio Grátis</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-gradient-to-br from-[#c2fa11]/30 to-[#33bd19]/30">
                                    <FiCheckCircle className="text-[#33bd19]" />
                                </div>
                                <span>Feedback da Comunidade</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Content - Featured Project Showcase */}
                    <div className="flex-1 w-full flex justify-center lg:justify-end relative">
                        {/* Decorative background for the card */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(194,250,17,0.2)_0%,rgba(51,189,25,0.08)_40%,rgba(255,255,255,0)_70%)] pointer-events-none" />

                        <div className="flex flex-col gap-6 w-full max-w-[500px]">
                            <div className="relative w-full">
                                {/* "Card Valioso" Effect */}
                                <div className="relative bg-white p-3 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] border border-[#e5e7eb] transition-transform duration-500 hover:scale-[1.01]">

                                    {/* Header do "Browser" minimalista */}
                                    <div className="flex items-center justify-between px-4 py-3 mb-2">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#fca5a5] border border-red-200" />
                                            <div className="w-3 h-3 rounded-full bg-[#fcd34d] border border-amber-200" />
                                            <div className="w-3 h-3 rounded-full bg-[#86efac] border border-green-200" />
                                        </div>
                                        <div className="px-3 py-1.5 bg-gradient-to-r from-[#c2fa11]/40 to-[#33bd19]/30 rounded-full text-[11px] font-bold text-[#1d6b22] uppercase tracking-wider flex items-center gap-1.5 border border-[#7dd634]/30">
                                            <FiTrendingUp className="text-[#33bd19]" size={14} />
                                            Destaque da semana
                                        </div>
                                    </div>

                                    {/* O Card em si */}
                                    <div className="rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-inner">
                                        {projectDTO ? (
                                            <ProjectCard
                                                project={projectDTO}
                                                disableHover
                                                disableConfig
                                                onClick={handleProjectClick}
                                            />
                                        ) : (
                                            <div className="h-[300px] bg-gray-50 flex items-center justify-center text-gray-400 font-medium">
                                                Carregando destaque...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Analysis / Worker Metrics section */}
                            {projectDTO && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
                                    <div className="bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#dcfce7] to-transparent rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                                        <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider mb-2">Análise do Worker</p>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[#4b5563] font-medium">Testes</span>
                                                <Badge variant="outline" className="bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0] font-bold">98%</Badge>
                                            </div>
                                            <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                                                <div className="h-full bg-[#22c55e] w-[98%] rounded-full" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#fef08a] to-transparent rounded-bl-full opacity-30 transition-opacity group-hover:opacity-60" />
                                        <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider mb-2">Performance</p>

                                        <div className="flex items-end gap-2 mt-1">
                                            <span className="text-3xl font-bold text-[#1f2937]">A+</span>
                                            <span className="text-xs font-medium text-[#16a34a] mb-2">Excelente</span>
                                        </div>
                                        <p className="text-[10px] text-[#6b7c7a] mt-1">Código limpo e otimizado</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Smooth gradient transition to FeedContent */}
            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#f8fdf5] via-[#f0fdf4]/60 to-transparent pointer-events-none" />
        </section>
    );
}

// Add simple CSS animation for the bounce
// styles.css or global.css should have this, but I'll add inline style for now works via class if tailwind configured
// If not, it just stays static which is fine.
