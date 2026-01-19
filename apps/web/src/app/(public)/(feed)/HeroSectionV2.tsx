"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";



import ProjectCard from "@/src/components/ProjectCard";
import { CreateProjectPanel } from "@/src/components/CreateProjectModal";
import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";

import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";
import { useTranslation } from "@/src/i18n/client";

import { FiArrowRight, FiCheckCircle, FiPlus, FiSearch, FiTrendingUp } from "react-icons/fi";



type Props = {
    projectDTO: ProjectCardDTO | null;
    session: Session | null;
};

export default function HeroSectionV2({ projectDTO, session }: Props) {
    const { dict } = useTranslation();
    const [selectedProject, setSelectedProject] = useState<ProjectForOverlay | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const uid = useId();

    const featuredProject = useMemo<ProjectForOverlay | null>(() => {
        if (!projectDTO) return null;

        return {
            id: projectDTO.id,
            userId: undefined,
            title: projectDTO.title,
            description: projectDTO.description,
            status: "PENDING",
            owner: {
                name: projectDTO.ownerName,
                image: projectDTO.ownerImage,
                username: projectDTO.ownerUsername,
            },
            repository: projectDTO.repositoryUrl
                ? {
                    id: 0,
                    url: projectDTO.repositoryUrl,
                    fullName: projectDTO.repositoryFullName || "",
                    name: projectDTO.repositoryFullName?.split("/")[1] || "",
                    isActive: true,
                }
                : null,
        };
    }, [projectDTO]);

    const handleProjectClick = () => {
        if (!featuredProject) return;
        setSelectedProject(featuredProject);
    };

    const handleProjectClose = () => setSelectedProject(null);

    // Overlay criar projeto
    if (isCreating) {
        return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative shadow-2xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 z-10 hover:bg-black/10 rounded-full"
                        onClick={() => setIsCreating(false)}
                        aria-label="Close"
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

    // Overlay ver projeto
    if (selectedProject) {
        return (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] overflow-y-auto flex flex-col relative shadow-2xl scrollbar-fintech">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 z-10 hover:bg-black/10 rounded-full"
                        onClick={handleProjectClose}
                        aria-label="Close"
                    >
                        <span className="text-xl">×</span>
                    </Button>
                    <FeedProjectPanel project={selectedProject} onClose={handleProjectClose} />
                </div>
            </div>
        );
    }

    return (
        <section className="relative w-full overflow-hidden bg-white">
            {/* Fundo no estilo do login: gradiente + grid sutil + orbs */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-[#f3fff9]" />
                <div className="absolute inset-0 opacity-[0.03]">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id={`grid-${uid}`} width="48" height="48" patternUnits="userSpaceOnUse">
                                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#047857" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#grid-${uid})`} />
                    </svg>
                </div>

                <div className="absolute -top-24 right-[-120px] w-[520px] h-[520px] rounded-full bg-[#05dc7f]/18 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
                <div className="absolute top-[20%] left-[-140px] w-[520px] h-[520px] rounded-full bg-[#a7f3d0]/35 blur-3xl animate-[float_14s_ease-in-out_infinite]" />

                <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(5,220,127,0.14),transparent_60%)]" />
            </div>

            {/* Conteúdo (reduzi altura para “encaixar” com o feed) */}
            <div className="relative mx-auto max-w-[1400px] px-6 md:px-12 pt-12 md:pt-14 pb-10 md:pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                    {/* LEFT */}
                    <div className="lg:col-span-6 flex flex-col gap-6 text-center lg:text-left">


                        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-[#052e16] leading-[1.02]">
                            {dict.feed.feedhero.title_prefix}{" "}
                            <span className="relative inline-block">
                                <span className="bg-gradient-to-r from-[#05dc7f] to-[#00b894] bg-clip-text text-transparent font-bold">
                                    {dict.feed.feedhero.title_highlight}
                                </span>
                                <span className="absolute left-0 -bottom-1 h-[8px] w-full rounded-full bg-[#05dc7f]/10 blur-[0.5px]" />
                            </span>
                        </h1>




                        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {dict.feed.feedhero.subtitle}
                        </p>

                        {/* CTA com hover alto-contraste (AbacatePay vibes) */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                            {!session ? (
                                <Button
                                    asChild
                                    className="group h-12 px-6 rounded-full bg-[#05dc7f] text-[#052e16] font-semibold shadow-lg shadow-[#05dc7f]/25 border border-[#05dc7f]/30
                             hover:bg-[#04c471] hover:shadow-[#05dc7f]/40 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Link href="/register">
                                        {dict.feed.feedhero.create_profile}
                                        <FiArrowRight className="ml-2 transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    className="group h-12 px-6 rounded-full bg-[#05dc7f] text-[#052e16] font-semibold shadow-lg shadow-[#05dc7f]/25 border border-[#05dc7f]/30
                             hover:bg-[#04c471] hover:shadow-[#05dc7f]/40 transition-all active:scale-[0.98] cursor-pointer"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <FiPlus className="mr-2" />
                                    {dict.feed.feedhero.new_project}
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                className="h-12 px-6 rounded-full border-[#05dc7f]/35 text-[#052e16] bg-white/70 hover:bg-[#eafff5] hover:border-[#05dc7f] transition-all cursor-pointer"
                                onClick={() => document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" })}
                            >
                                <FiSearch className="mr-2 text-[#05dc7f]" />
                                {dict.feed.feedhero.explore_projects}
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <FiCheckCircle className="text-[#05dc7f]" />
                                <span>{dict.feed.feedhero.free_portfolio}</span>
                            </div>
                            <span className="hidden sm:inline text-gray-300">•</span>
                            <div className="flex items-center gap-2">
                                <FiCheckCircle className="text-[#05dc7f]" />
                                <span>{dict.feed.feedhero.community_feedback}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Bento: card grande + 2 “chips” flutuantes (integra melhor) */}
                    <div className="lg:col-span-6 relative">
                        <div className="relative">
                            {/* “glow” atrás do card */}
                            <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(5,220,127,0.22),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(167,243,208,0.35),transparent_50%)] blur-2xl" />

                            <div className="relative rounded-[2.2rem] bg-white/70 backdrop-blur-md border border-black/5 shadow-[0_18px_60px_-24px_rgba(0,0,0,0.35)] overflow-hidden">
                                {/* Top bar mais clean */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/70" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/70" />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-semibold text-[#052e16] bg-[#eafff5] px-3 py-1.5 rounded-full border border-[#05dc7f]/20">
                                        <FiTrendingUp className="text-[#05dc7f]" />
                                        {dict.feed.feedhero.featured_week}
                                    </div>
                                </div>

                                <div className="p-3">
                                    <div className="rounded-2xl overflow-hidden ring-1 ring-black/5 bg-white">
                                        {projectDTO ? (
                                            <ProjectCard project={projectDTO} disableHover disableConfig onClick={handleProjectClick} />
                                        ) : (
                                            <div className="h-[300px] bg-white flex items-center justify-center text-gray-400 font-medium">
                                                {dict.feed.feedhero.loading_featured}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chips flutuantes removidos */}
                        </div>

                    </div>
                </div>
            </div>

            {/* Transição pro FeedContent - Gradiente longo e suave para um blend perfeito */}
            <div className="absolute bottom-0 left-0 w-full h-[320px] pointer-events-none bg-gradient-to-t from-white via-white/40 to-transparent z-10" />

            {/* keyframes */}
            <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, 14px, 0);
          }
        }

        @keyframes slideUpEntrance {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </section>
    );
}
