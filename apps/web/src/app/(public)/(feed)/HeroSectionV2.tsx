"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Session } from "next-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowRight, FiCheckCircle, FiPlus, FiSearch, FiTrendingUp } from "react-icons/fi";
import { MdFavorite, MdFavoriteBorder, MdOutlineVisibility } from "react-icons/md";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateProjectModal } from "@/src/components/CreateProjectModal";
import ProjectDetailsModal from "@/src/app/(public)/[username]/(profile)/components/modals/ProjectDetailsModal";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";
import { useTranslation } from "@/src/i18n/client";
import { useProjectModal } from "@/src/hooks/useProjectModal";
import { useSearch } from "@/src/providers/SearchContext";
import { toggleLike } from "@/src/domains/project/actions/toggle-like.action";
import { useAuthModal } from "@/src/providers/AuthModalContext";
import { getHighlightedProject } from "./actions/get-highlighted-project.action";

type Props = {
  projectDTO: ProjectCardDTO | null;
  session: Session | null;
};

export default function HeroSectionV2({ projectDTO, session }: Props) {
  const { dict } = useTranslation();
  const { projectId, openProject, closeProject } = useProjectModal("featured_project");
  const { setActiveTab } = useSearch();
  const [isCreating, setIsCreating] = useState(false);
  const [animateLike, setAnimateLike] = useState(false);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { openLoginModal } = useAuthModal();
  const { data: highlightedProject } = useQuery({
    queryKey: ["highlighted-project"],
    queryFn: () => getHighlightedProject(),
    initialData: projectDTO,
  });

  const featuredProject = useMemo<ProjectForOverlay | null>(() => {
    if (!highlightedProject) return null;

    return {
      id: highlightedProject.id,
      userId: highlightedProject.ownerId,
      title: highlightedProject.title,
      description: highlightedProject.description,
      status: highlightedProject.status,
      visibility: highlightedProject.visibility,
      images: highlightedProject.images,
      featuredTagIds: highlightedProject.featuredTagIds,
      tags: highlightedProject.tags,
      commentsCount: highlightedProject.commentsCount,
      owner: {
        name: highlightedProject.ownerName,
        image: highlightedProject.ownerImage,
        username: highlightedProject.ownerUsername,
      },
      repository: highlightedProject.repositoryUrl
        ? {
            id: 0,
            url: highlightedProject.repositoryUrl,
            fullName: highlightedProject.repositoryFullName || "",
            name: highlightedProject.repositoryFullName?.split("/")[1] || "",
            isActive: true,
            private: highlightedProject.repositoryIsPrivate ?? false,
          }
        : null,
    };
  }, [highlightedProject]);

  const handleProjectClick = () => {
    if (!featuredProject) return;
    openProject(featuredProject.id);
  };

  const selectedProject = projectId === featuredProject?.id ? featuredProject : null;
  const featuredImage = highlightedProject?.images?.[0] ?? null;
  const featuredRepo =
    highlightedProject?.repositoryFullName || highlightedProject?.repositoryUrl || null;
  const featuredRepoHref = highlightedProject?.repositoryUrl
    ? highlightedProject.repositoryUrl
    : highlightedProject?.repositoryFullName
      ? `https://github.com/${highlightedProject.repositoryFullName}`
      : null;
  const ownerInitials = (highlightedProject?.ownerName || "RT")
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isLiked = highlightedProject?.hasLiked ?? false;
  const likesCount = highlightedProject?.likes ?? 0;

  // Modal visibility is handled by isCreating state

  const updateProjectLikeInCaches = (projectId: number, nextLiked: boolean) => {
    queryClient.setQueryData<ProjectCardDTO | null>(["highlighted-project"], (current) => {
      if (!current || current.id !== projectId) return current;

      return {
        ...current,
        hasLiked: nextLiked,
        likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)),
      };
    });

    queryClient.setQueriesData<
      | {
          projects: ProjectCardDTO[];
          metadata: { total: number; page: number; limit: number; totalPages: number };
        }
      | undefined
    >({ queryKey: ["feed-projects"] }, (current) => {
      if (!current) return current;

      return {
        ...current,
        projects: current.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                hasLiked: nextLiked,
                likes: Math.max(0, project.likes + (nextLiked ? 1 : -1)),
              }
            : project
        ),
      };
    });
  };

  const handleLikeClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();

    if (!highlightedProject) return;

    if (!session?.user) {
      openLoginModal();
      return;
    }

    const nextLiked = !isLiked;
    setAnimateLike(true);
    updateProjectLikeInCaches(highlightedProject.id, nextLiked);

    startTransition(async () => {
      const response = await toggleLike(highlightedProject.id);

      if (response.success) {
        return;
      }

      updateProjectLikeInCaches(highlightedProject.id, !nextLiked);
    });
  };

  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_oklab,var(--secondary)_60%,transparent)_100%)] dark:bg-[linear-gradient(180deg,oklch(0.13_0.01_155)_0%,oklch(0.12_0.012_155)_58%,oklch(0.11_0.014_155)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[68%] bg-[radial-gradient(circle_at_78%_22%,color-mix(in_oklab,var(--primary)_16%,transparent)_0%,transparent_52%)] opacity-90 dark:bg-[radial-gradient(circle_at_78%_20%,color-mix(in_oklab,var(--primary)_10%,transparent)_0%,transparent_42%)] dark:opacity-100" />
        <div className="absolute inset-y-0 right-[-8%] w-[48rem] bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_14%,transparent)_0%,transparent_64%)] blur-3xl animate-[heroDrift_18s_ease-in-out_infinite] dark:bg-[radial-gradient(circle_at_center,rgba(5,220,127,0.08)_0%,rgba(5,220,127,0.025)_34%,transparent_64%)] dark:blur-[120px]" />
        <div className="absolute left-[-12%] top-[18%] h-64 w-64 rounded-full bg-primary/8 blur-[110px] animate-[heroPulse_12s_ease-in-out_infinite] dark:bg-white/[0.03] dark:blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.08] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_18%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_18%,transparent)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-[linear-gradient(90deg,transparent_0%,rgba(5,220,127,0.08)_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,rgba(5,220,127,0.035)_100%)] dark:block" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_oklab,var(--background)_78%,transparent)_62%,var(--background)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(16,22,19,0.72)_62%,var(--background)_100%)]" />
        <div className="absolute left-1/2 bottom-[-1.5rem] h-20 w-[min(44rem,72vw)] -translate-x-1/2 rounded-[999px] bg-primary/8 blur-[72px] dark:bg-primary/5" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[1400px] items-center px-4 py-6 pb-12 sm:px-6 sm:py-8 md:px-8 lg:px-12 md:py-10 md:pb-14">
        <div className="grid w-full items-center gap-8 min-[600px]:gap-7 md:grid-cols-2 md:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div className="flex max-w-[35rem] flex-col items-center text-center min-[600px]:max-w-[40rem] md:items-start md:text-left">
            <div
              className="opacity-0 animate-[heroFadeUp_0.7s_cubic-bezier(0.22,1,0.36,1)_forwards]"
              style={{ animationDelay: "40ms" }}
            ></div>

            <h1
              className="mt-4 max-w-[9ch] text-balance text-[2.6rem] font-semibold leading-[0.94] tracking-[-0.06em] text-foreground opacity-0 animate-[heroFadeUp_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards] sm:mt-5 sm:max-w-[10ch] sm:text-[3.4rem] min-[640px]:max-[760px]:max-w-[11ch] min-[640px]:max-[760px]:text-[3rem] md:max-w-[11ch] md:text-[3rem] lg:text-[4.6rem] xl:text-[5.7rem]"
              style={{ animationDelay: "120ms" }}
            >
              <span className="block">{dict.feed.feedhero.title_prefix}</span>
              <span className="relative mt-1 inline-block">
                <span className="block font-serif text-primary">
                  {dict.feed.feedhero.title_highlight}
                </span>
                <span className="hero-shiny-overlay font-serif" aria-hidden="true">
                  {dict.feed.feedhero.title_highlight}
                </span>
              </span>
            </h1>

            <p
              className="mt-4 max-w-[31rem] px-1 text-pretty text-[0.98rem] leading-7 text-muted-foreground opacity-0 animate-[heroFadeUp_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards] sm:mt-5 sm:px-0 sm:text-lg min-[640px]:max-[760px]:max-w-[36rem] min-[640px]:max-[760px]:text-[1rem] min-[640px]:max-[760px]:leading-7"
              style={{ animationDelay: "210ms" }}
            >
              {dict.feed.feedhero.subtitle}
            </p>

            <div
              className="mt-7 flex w-full flex-col gap-3 opacity-0 animate-[heroFadeUp_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards] sm:mt-8 sm:w-full min-[760px]:w-auto min-[760px]:flex-row min-[760px]:justify-center md:justify-start"
              style={{ animationDelay: "300ms" }}
            >
              {!session ? (
                <Button
                  asChild
                  className="group h-12 w-full rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklab,var(--primary)_55%,black)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 cursor-pointer min-[760px]:w-auto"
                >
                  <Link href="/register">
                    {dict.feed.feedhero.create_profile}
                    <FiArrowRight className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              ) : (
                <Button
                  className="group h-12 w-full rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklab,var(--primary)_55%,black)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 cursor-pointer min-[760px]:w-auto"
                  onClick={() => setIsCreating(true)}
                >
                  <FiPlus className="mr-2" />
                  {dict.feed.feedhero.new_project}
                </Button>
              )}

              <Button
                variant="outline"
                className="h-12 w-full rounded-full border-border/70 bg-background/75 px-6 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background cursor-pointer min-[760px]:w-auto"
                onClick={() => {
                  setActiveTab("projects");
                  document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <FiSearch className="mr-2 text-primary" />
                {dict.feed.feedhero.explore_projects}
              </Button>
            </div>

            <div
              className="mt-7 flex flex-col items-center gap-2.5 text-sm text-muted-foreground opacity-0 animate-[heroFadeUp_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards] sm:mt-8 min-[760px]:flex-row min-[760px]:flex-wrap min-[760px]:justify-center md:justify-start md:items-start"
              style={{ animationDelay: "380ms" }}
            >
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-primary" />
                <span>{dict.feed.feedhero.free_portfolio}</span>
              </div>
              <span className="hidden text-border min-[760px]:inline">/</span>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-primary" />
                <span>{dict.feed.feedhero.community_feedback}</span>
              </div>
            </div>
          </div>

          <div
            className="relative mx-auto w-full max-w-[33rem] opacity-0 animate-[heroFadeUp_0.9s_cubic-bezier(0.22,1,0.36,1)_forwards] min-[600px]:max-w-[36rem] md:ml-auto md:max-w-[38rem]"
            style={{ animationDelay: "180ms" }}
          >
            <div className="absolute inset-x-[12%] top-[12%] h-[72%] rounded-[2.5rem] bg-primary/15 blur-3xl animate-[heroDrift_20s_ease-in-out_infinite] dark:bg-black/45 dark:blur-[70px] sm:inset-x-[14%] sm:top-[14%] sm:h-[68%]" />

            <div
              role="button"
              tabIndex={0}
              onClick={handleProjectClick}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleProjectClick();
                }
              }}
              className="group relative block w-full overflow-hidden rounded-[1.7rem] border border-border/60 bg-background/75 text-left shadow-[0_26px_80px_-42px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:rounded-[2rem] sm:shadow-[0_32px_90px_-42px_rgba(0,0,0,0.45)] dark:border-white/14 dark:bg-[linear-gradient(180deg,rgba(18,25,22,0.98)_0%,rgba(20,30,25,0.98)_100%)] dark:shadow-[0_42px_120px_-52px_rgba(0,0,0,0.92),0_24px_64px_-36px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.05)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--background)_82%,transparent)_10%,transparent_42%,color-mix(in_oklab,var(--primary)_8%,transparent)_100%)] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_28%,rgba(5,220,127,0.03)_100%)]" />
              <div className="absolute inset-[1px] rounded-[calc(1.7rem-1px)] border border-white/0 dark:border-white/[0.045] sm:rounded-[calc(2rem-1px)]" />

              <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-4 min-[760px]:flex-nowrap min-[760px]:gap-4 min-[760px]:px-6">
                <Link
                  href={`/${highlightedProject?.ownerUsername || "retold"}`}
                  onClick={(event) => event.stopPropagation()}
                  className="group/creator flex min-w-0 items-center gap-3"
                >
                  <Avatar className="h-11 w-11 border border-primary/15 bg-primary/12 transition-all duration-200 group-hover/creator:border-primary/45 group-hover/creator:scale-[1.03]">
                    <AvatarImage
                      src={highlightedProject?.ownerImage || undefined}
                      alt={highlightedProject?.ownerName || "Retold"}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/12 text-sm font-semibold text-primary">
                      {ownerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground transition-colors duration-200 group-hover/creator:text-primary">
                      {highlightedProject?.ownerName || "Retold"}
                    </p>
                    <p className="truncate text-xs font-medium lowercase text-muted-foreground">
                      @{highlightedProject?.ownerUsername || "retold"}
                    </p>
                  </div>
                </Link>

                <div className="flex w-full justify-start min-[760px]:w-auto min-[760px]:justify-end">
                  <Badge
                    variant="secondary"
                    className="shrink-0 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-foreground/75 dark:border-white/12 dark:bg-white/[0.04] dark:text-white/78 sm:text-[0.65rem] sm:tracking-[0.22em]"
                  >
                    <FiTrendingUp className="mr-1.5" />
                    {dict.feed.feedhero.featured_week}
                  </Badge>
                </div>
              </div>

              <div className="relative p-3 sm:p-4">
                <div className="relative h-[15.5rem] overflow-hidden rounded-[1.25rem] bg-secondary/60 ring-1 ring-black/5 sm:h-[18rem] sm:rounded-[1.55rem] min-[640px]:max-[760px]:h-[16.5rem] lg:h-[26rem] dark:bg-black/20 dark:ring-white/12 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                  {featuredImage ? (
                    <Image
                      src={featuredImage}
                      alt={highlightedProject?.title || dict.feed.feedhero.featured_week}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 86vw, 52vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                  ) : (
                    <div className="flex h-[15.5rem] w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_45%),linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent_60%)] text-sm uppercase tracking-[0.24em] text-muted-foreground sm:h-[18rem] min-[640px]:max-[760px]:h-[16.5rem] lg:h-[26rem]">
                      {dict.feed.feedhero.loading_featured}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.72)_100%)] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.16)_36%,rgba(0,0,0,0.82)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7">
                    <h2 className="max-w-[12ch] text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:mt-3 sm:max-w-[14ch] sm:text-[2.6rem] min-[640px]:max-[760px]:text-[2.35rem] md:text-[2.2rem] lg:text-[3rem] xl:text-[3.4rem]">
                      {highlightedProject?.title || dict.feed.feedhero.title_highlight}
                    </h2>
                    <p className="mt-3 max-w-[34rem] line-clamp-3 text-sm leading-5 text-white/78 sm:line-clamp-4 sm:text-[0.98rem] sm:leading-6">
                      {highlightedProject?.description || dict.feed.feedhero.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col gap-3 px-4 py-4 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between min-[760px]:px-6">
                <div className="min-w-0 flex-1">
                  {featuredRepoHref && featuredRepo ? (
                    <a
                      href={featuredRepoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      className="inline-flex max-w-full items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-primary"
                    >
                      <span className="truncate">{featuredRepo}</span>
                      <FiArrowRight className="shrink-0" />
                    </a>
                  ) : (
                    <p className="truncate pt-1 text-sm text-foreground/80">
                      @{highlightedProject?.ownerUsername || "retold"}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/72 dark:text-white/72 min-[760px]:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleLikeClick}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleLikeClick(event);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 transition-colors ${isPending ? "pointer-events-none opacity-70" : "cursor-pointer"} ${isLiked ? "text-[#ff4d4d]" : "hover:text-[#ff4d4d]"}`}
                  >
                    {isLiked ? (
                      <MdFavorite
                        size={22}
                        className={
                          animateLike
                            ? "animate-[heartPop_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]"
                            : ""
                        }
                        onAnimationEnd={() => setAnimateLike(false)}
                      />
                    ) : (
                      <MdFavoriteBorder
                        size={22}
                        className={
                          animateLike
                            ? "animate-[heartPop_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]"
                            : ""
                        }
                        onAnimationEnd={() => setAnimateLike(false)}
                      />
                    )}
                    <span>{likesCount}</span>
                  </button>
                  <div className="inline-flex items-center gap-1.5">
                    <MessageCircle size={18} className="-translate-y-[1px]" />
                    <span>{highlightedProject?.commentsCount ?? 0}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <MdOutlineVisibility size={22} />
                    <span>{highlightedProject?.views ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProjectDetailsModal
        isOpen={!!selectedProject}
        onClose={closeProject}
        project={selectedProject}
      />

      <CreateProjectModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSuccess={() => {
          setIsCreating(false);
          queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
          queryClient.invalidateQueries({ queryKey: ["highlighted-project"] });
          setTimeout(() => {
            document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }}
      />


      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes heroFadeUp {
              from {
                opacity: 0;
                transform: translate3d(0, 20px, 0);
              }
              to {
                opacity: 1;
                transform: translate3d(0, 0, 0);
              }
            }

            @keyframes heroDrift {
              0%,
              100% {
                transform: translate3d(0, 0, 0) scale(1);
              }
              50% {
                transform: translate3d(0, 18px, 0) scale(1.03);
              }
            }

            @keyframes heroPulse {
              0%,
              100% {
                opacity: 0.55;
                transform: scale(1);
              }
              50% {
                opacity: 0.85;
                transform: scale(1.08);
              }
            }

            @keyframes heroWordShine {
              0% {
                background-position: 120% center;
              }
              100% {
                background-position: -120% center;
              }
            }

            .hero-shiny-overlay {
              position: absolute;
              inset: 0;
              display: block;
              color: transparent;
              -webkit-text-fill-color: transparent;
              background: linear-gradient(
                115deg,
                transparent 0%,
                transparent 42%,
                rgba(255, 255, 255, 0.98) 50%,
                transparent 58%,
                transparent 100%
              );
              background-size: 220% 100%;
              background-position: 120% center;
              background-repeat: no-repeat;
              background-clip: text;
              -webkit-background-clip: text;
              animation: heroWordShine 2.8s linear infinite;
              pointer-events: none;
            }
          `,
        }}
      />
    </section>
  );
}
