"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import ProjectCard from "@/src/components/ProjectCard";
import { CreateProjectPanel } from "@/src/components/CreateProjectModal";
import ProjectDetailsModal from "@/src/app/(public)/[username]/(profile)/components/modals/ProjectDetailsModal";

import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";
import { useTranslation } from "@/src/i18n/client";
import { useProjectModal } from "@/src/hooks/useProjectModal";
import { useSearch } from "@/src/providers/SearchContext";

import { FiArrowRight, FiCheckCircle, FiPlus, FiSearch, FiTrendingUp } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  projectDTO: ProjectCardDTO | null;
  session: Session | null;
};

export default function HeroSectionV2({ projectDTO, session }: Props) {
  const { dict } = useTranslation();
  const { projectId, openProject, closeProject } = useProjectModal("featured_project");
  const { setActiveTab } = useSearch();
  const [isCreating, setIsCreating] = useState(false);
  const uid = useId();
  const queryClient = useQueryClient();

  const featuredProject = useMemo<ProjectForOverlay | null>(() => {
    if (!projectDTO) return null;

    return {
      id: projectDTO.id,
      userId: projectDTO.ownerId,
      title: projectDTO.title,
      description: projectDTO.description,
      status: projectDTO.status,
      images: projectDTO.images,
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
            private: projectDTO.repositoryIsPrivate ?? false,
          }
        : null,
    };
  }, [projectDTO]);

  const handleProjectClick = () => {
    if (!featuredProject) return;
    openProject(featuredProject.id);
  };

  // Determine if modal should show based on URL
  const selectedProject = projectId === featuredProject?.id ? featuredProject : null;

  // Lock body scroll when creating project overlay is open
  useEffect(() => {
    if (isCreating) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreating]);

  return (
    <section className="relative w-full overflow-hidden bg-background">
      {/* ── Premium Hero Background ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
        }}
      >
        {/* Base gradient — shifts from page bg to secondary */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary" />

        {/* ── Layer 1: Dot grid pattern ── */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`dots-${uid}`} width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="fill-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dots-${uid})`} />
        </svg>

        {/* ── Layer 2: Main decorative SVG ── */}
        <svg
          className="absolute inset-0 w-full h-full will-change-transform"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1440 800"
        >
          <defs>
            {/* Mesh gradient orbs */}
            <radialGradient id={`orb1-${uid}`} cx="75%" cy="25%" r="45%">
              <stop offset="0%" className="hero-orb-1-inner" />
              <stop offset="100%" className="hero-orb-1-outer" />
            </radialGradient>
            <radialGradient id={`orb2-${uid}`} cx="85%" cy="70%" r="35%">
              <stop offset="0%" className="hero-orb-2-inner" />
              <stop offset="100%" className="hero-orb-2-outer" />
            </radialGradient>
            <radialGradient id={`orb3-${uid}`} cx="20%" cy="80%" r="30%">
              <stop offset="0%" className="hero-orb-3-inner" />
              <stop offset="100%" className="hero-orb-3-outer" />
            </radialGradient>
            {/* Top-right glow cone */}
            <radialGradient id={`glow-${uid}`} cx="80%" cy="10%" r="50%">
              <stop offset="0%" className="hero-glow-inner" />
              <stop offset="60%" className="hero-glow-mid" />
              <stop offset="100%" className="hero-glow-outer" />
            </radialGradient>
            {/* Soft line glow filter */}
            <filter id={`softglow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
            </filter>
          </defs>

          {/* Gradient orb fills - right side weighted */}
          <ellipse cx="1080" cy="200" rx="520" ry="420" fill={`url(#orb1-${uid})`} className="animate-[float_14s_ease-in-out_infinite] will-change-transform" />
          <ellipse cx="1250" cy="560" rx="400" ry="340" fill={`url(#orb2-${uid})`} className="animate-[float_18s_ease-in-out_infinite_reverse] will-change-transform" />
          <ellipse cx="280" cy="620" rx="300" ry="260" fill={`url(#orb3-${uid})`} className="animate-[float_16s_ease-in-out_infinite] will-change-transform" />

          {/* Top-right glow cone */}
          <rect x="0" y="0" width="1440" height="800" fill={`url(#glow-${uid})`} />

          {/* ── Layer 3: Flowing curves ── */}
          <g className="hero-curves" filter={`url(#softglow-${uid})`}>
            <path
              d="M 800 0 Q 950 200, 1100 180 T 1440 320"
              fill="none"
              strokeWidth="1.5"
              className="hero-curve-stroke"
            />
            <path
              d="M 700 0 Q 900 280, 1080 260 T 1440 420"
              fill="none"
              strokeWidth="1"
              className="hero-curve-stroke-alt"
            />
            <path
              d="M 900 800 Q 1100 500, 1300 520 T 1440 300"
              fill="none"
              strokeWidth="1.2"
              className="hero-curve-stroke"
            />
          </g>

          {/* ── Layer 4: Floating particles ── */}
          <g className="hero-particles">
            {/* Right cluster */}
            <circle cx="1050" cy="150" r="2.5" className="hero-particle animate-[float_8s_ease-in-out_infinite]" />
            <circle cx="1200" cy="250" r="1.8" className="hero-particle animate-[float_10s_ease-in-out_infinite_reverse]" />
            <circle cx="1300" cy="180" r="3" className="hero-particle animate-[float_12s_ease-in-out_infinite]" />
            <circle cx="1100" cy="400" r="2" className="hero-particle animate-[float_9s_ease-in-out_infinite_reverse]" />
            <circle cx="1350" cy="450" r="2.5" className="hero-particle animate-[float_11s_ease-in-out_infinite]" />
            <circle cx="1250" cy="350" r="1.5" className="hero-particle animate-[float_7s_ease-in-out_infinite_reverse]" />
            {/* Scattered middle-right */}
            <circle cx="950" cy="300" r="1.8" className="hero-particle animate-[float_13s_ease-in-out_infinite]" />
            <circle cx="850" cy="500" r="2.2" className="hero-particle animate-[float_15s_ease-in-out_infinite_reverse]" />
            <circle cx="1000" cy="600" r="1.5" className="hero-particle animate-[float_10s_ease-in-out_infinite]" />
            {/* Sparse left (very subtle) */}
            <circle cx="300" cy="200" r="1.2" className="hero-particle-faint animate-[float_14s_ease-in-out_infinite]" />
            <circle cx="150" cy="400" r="1" className="hero-particle-faint animate-[float_16s_ease-in-out_infinite_reverse]" />
          </g>

          {/* ── Layer 5: Code-inspired bracket patterns (right side) ── */}
          <g className="hero-code-patterns" opacity="0.08">
            {/* Angle brackets */}
            <text x="1050" y="120" fontSize="28" fontFamily="monospace" className="hero-code-text animate-[float_10s_ease-in-out_infinite]">{"<>"}</text>
            <text x="1280" y="280" fontSize="22" fontFamily="monospace" className="hero-code-text animate-[float_12s_ease-in-out_infinite_reverse]">{"/>"}</text>
            <text x="1150" y="500" fontSize="20" fontFamily="monospace" className="hero-code-text animate-[float_14s_ease-in-out_infinite]">{"{ }"}</text>
            <text x="1320" y="600" fontSize="18" fontFamily="monospace" className="hero-code-text animate-[float_8s_ease-in-out_infinite_reverse]">{"( )"}</text>
            <text x="980" cy="700" y="680" fontSize="16" fontFamily="monospace" className="hero-code-text animate-[float_11s_ease-in-out_infinite]">{"=>"}</text>
          </g>

          {/* ── Layer 6: Geometric accent lines ── */}
          <g className="hero-accent-lines" opacity="0.06">
            <line x1="1000" y1="0" x2="1200" y2="800" className="hero-accent-stroke" strokeWidth="0.5" />
            <line x1="1100" y1="0" x2="1300" y2="800" className="hero-accent-stroke" strokeWidth="0.5" />
            <line x1="1200" y1="0" x2="1400" y2="800" className="hero-accent-stroke" strokeWidth="0.5" />
          </g>
        </svg>

        {/* ── Layer 7: CSS glow orbs (for blur overflow beyond SVG) ── */}
        <div className="absolute -top-32 right-[-80px] w-[600px] h-[600px] rounded-full bg-primary/15 dark:bg-primary/10 blur-[100px] animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#4ade80]/10 dark:bg-[#22d3ee]/8 blur-[80px] animate-[float_18s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[350px] h-[350px] rounded-full bg-primary/8 dark:bg-primary/5 blur-[90px] animate-[float_16s_ease-in-out_infinite]" />

        {/* ── Layer 8: Top radial light wash ── */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_70%_0%,oklch(0.75_0.20_145_/_0.12),transparent_70%)] dark:bg-[radial-gradient(60%_40%_at_70%_0%,oklch(0.75_0.20_145_/_0.08),transparent_70%)]" />
      </div>

      {/* Conteúdo (aumentei o padding inferior para dar espaço à transição suave) */}
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12 pt-12 md:pt-14 pb-24 md:pb-32 z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT */}
          <div className="lg:col-span-6 flex flex-col gap-6 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.02] animate-[slideUpEntrance_0.6s_ease-out_forwards]">
              {dict.feed.feedhero.title_prefix}{" "}
              <span className="relative inline-block">
                {/* Base gradient text */}
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-bold">
                  {dict.feed.feedhero.title_highlight}
                </span>
                {/* Shine overlay - inline styles prevent FOUC */}
                <span
                  className="shiny-overlay"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                >
                  {dict.feed.feedhero.title_highlight}
                </span>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              {dict.feed.feedhero.subtitle}
            </p>

            {/* CTA com hover alto-contraste (AbacatePay vibes) */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              {!session ? (
                <Button
                  asChild
                  className="group h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 border border-primary/30
                             hover:bg-primary/90 hover:shadow-primary/40 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Link href="/register">
                    {dict.feed.feedhero.create_profile}
                    <FiArrowRight className="ml-2 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  className="group h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 border border-primary/30
                             hover:bg-primary/90 hover:shadow-primary/40 transition-all active:scale-[0.98] cursor-pointer"
                  onClick={() => setIsCreating(true)}
                >
                  <FiPlus className="mr-2" />
                  {dict.feed.feedhero.new_project}
                </Button>
              )}

              <Button
                variant="outline"
                className="h-12 px-6 rounded-full border-primary/30 text-foreground bg-background/70 hover:bg-background hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
                onClick={() => {
                  setActiveTab("projects");
                  document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <FiSearch className="mr-2 text-primary group-hover:text-primary" />
                {dict.feed.feedhero.explore_projects}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-primary" />
                <span>{dict.feed.feedhero.free_portfolio}</span>
              </div>
              <span className="hidden sm:inline text-muted-foreground/40">•</span>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-primary" />
                <span>{dict.feed.feedhero.community_feedback}</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Bento: card grande + 2 “chips” flutuantes (integra melhor) */}
          <div className="lg:col-span-6 relative">
            <div className="relative">
              {/* “glow” atrás do card */}
              <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,oklch(0.75_0.20_145_/_0.22),transparent_55%),radial-gradient(circle_at_70%_80%,oklch(0.75_0.20_145_/_0.30),transparent_50%)] blur-2xl" />

              <div className="relative rounded-[2.2rem] bg-background/70 backdrop-blur-md border border-border/5 shadow-[0_18px_60px_-24px_rgba(0,0,0,0.35)] overflow-hidden">
                {/* Top bar mais clean */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground bg-secondary px-3 py-1.5 rounded-full border border-primary/20">
                    <FiTrendingUp className="text-primary" />
                    {dict.feed.feedhero.featured_week}
                  </div>
                </div>

                <div className="p-3">
                  <div className="rounded-2xl overflow-hidden ring-1 ring-border/5 bg-card">
                    {projectDTO ? (
                      <ProjectCard
                        project={projectDTO}
                        disableHover
                        disableConfig
                        onClick={handleProjectClick}
                      />
                    ) : (
                      <div className="h-[300px] bg-card flex items-center justify-center text-muted-foreground font-medium">
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

      <ProjectDetailsModal
        isOpen={!!selectedProject}
        onClose={closeProject}
        project={selectedProject}
      />

      {/* Create Project Overlay */}
      {isCreating &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 cursor-pointer hover:bg-muted rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreating(false)}
                aria-label="Close"
              >
                <span className="text-2xl leading-none">×</span>
              </Button>

              <CreateProjectPanel
                onClose={() => setIsCreating(false)}
                onSuccess={() => {
                  setIsCreating(false);
                  queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
                  setTimeout(() => {
                    document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {/* keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
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

        /* ShinyText Effect - only white shine passing */
        .shiny-overlay {
          position: absolute;
          inset: 0;
          display: inline-block;
          font-weight: 700;
          background: linear-gradient(
            120deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 1) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: shiny-slide 2s linear infinite;
          pointer-events: none;
        }

        @keyframes shiny-slide {
          0% {
            background-position: 100% center;
          }
          100% {
            background-position: -100% center;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* ── Hero Background SVG Styles ── */

        /* Light mode orb gradients */
        .hero-orb-1-inner { stop-color: #4ade80; stop-opacity: 0.18; }
        .hero-orb-1-outer { stop-color: #4ade80; stop-opacity: 0; }
        .hero-orb-2-inner { stop-color: #34d399; stop-opacity: 0.14; }
        .hero-orb-2-outer { stop-color: #34d399; stop-opacity: 0; }
        .hero-orb-3-inner { stop-color: #a7f3d0; stop-opacity: 0.10; }
        .hero-orb-3-outer { stop-color: #a7f3d0; stop-opacity: 0; }

        /* Light mode glow */
        .hero-glow-inner { stop-color: #4ade80; stop-opacity: 0.08; }
        .hero-glow-mid   { stop-color: #4ade80; stop-opacity: 0.02; }
        .hero-glow-outer  { stop-color: #4ade80; stop-opacity: 0; }

        /* Light mode curves */
        .hero-curve-stroke     { stroke: rgba(74, 222, 128, 0.25); }
        .hero-curve-stroke-alt { stroke: rgba(52, 211, 153, 0.15); }

        /* Light mode particles */
        .hero-particle       { fill: rgba(74, 222, 128, 0.35); }
        .hero-particle-faint { fill: rgba(74, 222, 128, 0.15); }

        /* Light mode code text */
        .hero-code-text { fill: rgba(74, 222, 128, 0.6); }

        /* Light mode accent lines */
        .hero-accent-stroke { stroke: rgba(74, 222, 128, 0.3); }

        /* ── Dark mode overrides ── */
        .dark .hero-orb-1-inner { stop-color: #22d3ee; stop-opacity: 0.12; }
        .dark .hero-orb-1-outer { stop-color: #22d3ee; stop-opacity: 0; }
        .dark .hero-orb-2-inner { stop-color: #4ade80; stop-opacity: 0.10; }
        .dark .hero-orb-2-outer { stop-color: #4ade80; stop-opacity: 0; }
        .dark .hero-orb-3-inner { stop-color: #06b6d4; stop-opacity: 0.06; }
        .dark .hero-orb-3-outer { stop-color: #06b6d4; stop-opacity: 0; }

        .dark .hero-glow-inner { stop-color: #22d3ee; stop-opacity: 0.10; }
        .dark .hero-glow-mid   { stop-color: #4ade80; stop-opacity: 0.03; }
        .dark .hero-glow-outer  { stop-color: #4ade80; stop-opacity: 0; }

        .dark .hero-curve-stroke     { stroke: rgba(34, 211, 238, 0.30); }
        .dark .hero-curve-stroke-alt { stroke: rgba(74, 222, 128, 0.18); }

        .dark .hero-particle       { fill: rgba(34, 211, 238, 0.45); }
        .dark .hero-particle-faint { fill: rgba(34, 211, 238, 0.18); }

        .dark .hero-code-text { fill: rgba(34, 211, 238, 0.5); }

        .dark .hero-accent-stroke { stroke: rgba(34, 211, 238, 0.25); }
      `}} />
    </section>
  );
}
