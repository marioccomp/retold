"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";

import {
  Github,
  Clock,
  XCircle,
  Sparkles,
  Loader2,
  PackageSearch,
  CheckCircle2,
  Lightbulb,
  FileCode,
  Settings,
  Layout,
  Code2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { ProjectForOverlay } from "./types";
import { useProjectAnalysis } from "./hooks/useProjectAnalysis";
import { ProjectSettings } from "./components/ProjectSettings";
import { useTranslation } from "@/src/i18n/client";
import { incrementView } from "@/src/domains/project/actions/increment-view.action";
import { CommentSection } from "./CommentSection";
import { capitalizeSkill, cn } from "@/lib/utils";

type FeedProjectPanelProps = {
  project: ProjectForOverlay;
  onClose: () => void;
  isModal?: boolean;
};

type LlmReportV21 = {
  schema_version: "2.1" | "2.0" | string;
  language: "pt-BR" | "en" | string;

  meta?: {
    primaryLanguage?: string;
    appType?: string;
    domain?: string;
    purpose?: string;
  };

  summary?: {
    title?: string;
    description?: string;
    paragraphs?: string[];
  };

  architecture?: {
    explanation?: string;
  };

  strengths?: Array<{
    name: string;
    explanation: string;
  }>;

  weaknesses?: Array<{
    name: string;
    explanation: string;
  }>;

  suggestions?: Array<{
    name: string;
    explanation: string;
  }>;

  error?: string;
  raw?: string;
};

function safeParseLlm(input: unknown): LlmReportV21 | null {
  if (!input) return null;
  if (typeof input === "object") return input as LlmReportV21;
  if (typeof input !== "string") return null;

  try {
    return JSON.parse(input) as LlmReportV21;
  } catch {
    const trimmed = input.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]) as LlmReportV21;
      } catch {
        return { schema_version: "2.1", language: "en", error: "Invalid JSON", raw: input };
      }
    }
    return { schema_version: "2.1", language: "en", error: "Invalid JSON", raw: input };
  }
}

export function FeedProjectPanel({ project, onClose, isModal }: FeedProjectPanelProps) {
  const { dict } = useTranslation();
  const t = dict.project;
  const { data: session } = useSession();
  const repo = project.repository;

  const queryClient = useQueryClient();
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (!hasIncremented.current && project.owner?.username !== session?.user?.username) {
      incrementView(project.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
        queryClient.invalidateQueries({ queryKey: ["highlighted-project"] });
      });

      hasIncremented.current = true;
    }
  }, [project.id, queryClient]);

  const isOwner = session?.user?.id && project.userId && Number(session.user.id) === project.userId;

  const { status, nextRetryAt, analysis, data, handleAnalyzeRepo } = useProjectAnalysis(project);

  const llm = safeParseLlm(data?.llmOverview);
  const hasOwnerSuggestions = Boolean(isOwner && llm?.suggestions && llm.suggestions.length > 0);
  const techStack = Array.from(
    new Set(
      [
        ...(data?.stack.languages || []),
        ...(data?.stack.frameworks || []),
        ...(data?.stack.tools || []),
        ...(data?.infra?.ciProviders || []),
        ...((project.tags || []).map((tag) => tag.name) || []),
      ]
        .filter(Boolean)
        .map((tech) => capitalizeSkill(String(tech)))
    )
  );

  return (
    <div
      className={cn(
        "flex flex-col w-full h-auto animate-in fade-in slide-in-from-top-2 duration-300",
        !isModal && "bg-background rounded-xl border border-border shadow-2xl"
      )}
    >
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Modern Glassy Header */}
      <div className="sticky top-0 left-0 right-0 px-6 py-3 md:py-4 border-b border-border/50 bg-background/95 backdrop-blur-md z-50 flex items-center justify-between gap-4 will-change-transform">
        {/* Close Button - Left side on mobile, or right side? User asked for "header com X pra fechar" */}
        {/* Based on print, X is on left, title center/left, actions right. But usually X is top-right or top-left. */}
        {/* Let's put X on the top-right for consistency with previous design, or top-left if it's a bottom sheet... */}
        {/* The user print shows "X Nova Resenha ... Publicar". X is on the LEFT. */}
        {/* So I will put X on the LEFT for mobile feel. */}

        <div className="relative flex items-center justify-between w-full">
          <div className="flex items-center gap-2 shrink-0 z-10">
            {isOwner && (
              <ProjectSettings
                project={{
                  ...project,
                  ownerUsername: project.owner?.username,
                }}
                onDelete={onClose}
                triggerClassName="p-2 -ml-2 text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted rounded-xl transition-all cursor-pointer border border-transparent hover:border-border"
              />
            )}
          </div>

          {/* Title in Header for Sticky context - Centered */}
          <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-foreground truncate max-w-[60%] text-center">
            {t.overlay?.details || "Detalhes do Projeto"}
          </h2>

          <div className="flex items-center gap-2 shrink-0 z-10">
            {isModal && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors z-10 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative px-6 py-4 md:py-6 border-b border-border/50 bg-background z-10 w-full">
        <div className="flex flex-col md:flex-row gap-6 md:items-start max-w-5xl mx-auto w-full">
          {/* Owner Avatar & Name */}
          <div className="shrink-0 mx-auto md:mx-0">
            {project.owner && (
              <Link
                href={`/${project.owner.username}`}
                className="flex flex-col items-center gap-3 group"
              >
                <Avatar className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-green-100/50 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md cursor-pointer">
                  <AvatarImage src={project.owner.image || undefined} />
                  <AvatarFallback className="rounded-full text-xl bg-secondary text-foreground font-bold">
                    {project.owner.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-foreground/80 group-hover:text-primary transition-colors text-center max-w-[120px] leading-tight break-words">
                  {project.owner.name}
                </span>
              </Link>
            )}
          </div>

          {/* Title & Meta */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0">
            <h2 className="text-xl md:text-3xl font-black text-foreground tracking-tight leading-tight break-words w-full">
              {project.title}
            </h2>

            {/* Description & Repo Row */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mt-2 w-full">
              {project.description && (
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-3xl text-justify">
                  {project.description}
                </p>
              )}

              {/* Repo Link - Hidden on mobile, shown on right on desktop */}
              {repo && !repo.private && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium transition-colors px-2 py-1 rounded-full hover:bg-secondary/50 shrink-0"
                >
                  <Github className="w-3.5 h-3.5 shrink-0" />
                  <span>{repo.fullName}</span>
                </a>
              )}
            </div>

            {/* Mobile Repo Link (shown below description on mobile) */}
            {repo && !repo.private && (
              <div className="md:hidden mt-3 flex justify-center w-full">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium transition-colors px-2 py-1 rounded-full hover:bg-secondary/50 max-w-full"
                >
                  <Github className="w-3.5 h-3.5 shrink-0" />
                  <span>{repo.fullName}</span>
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 w-full">
              {/* Classification Tags */}
              {data?.summary && (
                <>
                  {data.summary.primaryLanguage && (
                    <Badge variant="secondary" className="border-secondary-foreground/20">
                      {data.summary.primaryLanguage}
                    </Badge>
                  )}
                  {data.summary.appType && data.summary.appType !== "Unknown" && (
                    <Badge variant="secondary" className="border-secondary-foreground/20">
                      {humanizeEnum(data.summary.appType)}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Images Gallery */}
      {project.images && project.images.length > 0 && (
        <div className="px-4 md:px-8 py-6 bg-background border-b border-border/50">
          <div className="max-w-5xl mx-auto">
            <ImageGallery images={project.images} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-muted/50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Stats Cards Row */}
          {status === "DONE" && data?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                icon={FileCode}
                label={t.metrics.files.replace("{count}", "").trim()}
                value={data.stats.totalFiles}
                sublabel={t.overlay.stats.total_files}
              />
              <StatCard
                icon={Code2}
                label={t.overlay.stats.sources}
                value={data.stats.sourceFiles}
                sublabel={t.overlay.stats.code_files}
                color="blue"
              />
              <StatCard
                icon={Settings}
                label={t.overlay.stats.config}
                value={data.stats.configFiles}
                sublabel={t.overlay.stats.infra_setup}
                color="orange"
              />
              <StatCard
                icon={CheckCircle2}
                label={t.overlay.stats.tests}
                value={data.stats.testFiles}
                sublabel={
                  data.infra?.hasTests ? t.overlay.stats.tests_found : t.overlay.stats.no_tests
                }
                color={data.stats.testFiles > 0 ? "green" : "gray"}
              />
            </div>
          )}

          {/* Main State Views */}
          {status === "PENDING" &&
            (isOwner ? (
              <PendingView onAnalyze={handleAnalyzeRepo} t={t} />
            ) : (
              <EmptyStateView
                icon={Clock}
                title={t.overlay.analysis_not_started.title}
                description={t.overlay.analysis_not_started.description}
              />
            ))}

          {status === "ANALYZING" && <AnalyzingView t={t} />}

          {status === "ERROR" &&
            (isOwner ? (
              <ErrorView onRetry={handleAnalyzeRepo} t={t} />
            ) : (
              <EmptyStateView
                icon={XCircle}
                title={t.overlay.analysis_error.title}
                description={t.overlay.analysis_error.description}
                color="red"
              />
            ))}

          {status === "RATE_LIMITED" && (
            <RateLimitedView t={t} nextRetryAt={nextRetryAt} isOwner={Boolean(isOwner)} />
          )}

          {/* Report Content - Unified View */}
          {status === "DONE" && (
            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
              {llm ? (
                <>
                  <div className="p-6 md:p-10 space-y-10">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-foreground tracking-tight">
                        {t.overlay.sections.summary}
                      </h3>

                      {llm.summary?.paragraphs && llm.summary.paragraphs.length > 0 ? (
                        <div className="space-y-4">
                          {llm.summary.paragraphs.map((p, i) => (
                            <p
                              key={i}
                              className="text-foreground/80 text-lg leading-relaxed whitespace-pre-wrap text-justify"
                            >
                              {p}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-foreground/80 text-lg leading-relaxed whitespace-pre-wrap text-justify">
                          {llm.summary?.description || t.overlay.llm_empty_overview}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Key Strengths */}
                    <div>
                      <SectionHeader
                        title={t.overlay.sections.strengths}
                        icon={Sparkles}
                        color="green"
                      />
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {llm.strengths?.slice(0, 4).map((s, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-secondary/30 border border-secondary hover:border-secondary/80 transition-colors"
                          >
                            <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                              {s.name}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {s.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Architecture Section */}
                    <div>
                      <SectionHeader
                        title={t.overlay.sections.architecture}
                        icon={Layout}
                        color="purple"
                      />
                      <div className="mt-4 p-6 bg-muted rounded-2xl border border-border/60">
                        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {llm.architecture?.explanation || t.overlay.llm_empty_architecture}
                        </p>
                      </div>
                    </div>

                    {/* Tech Stack */}
                    {techStack.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <SectionHeader
                            title={t.overlay.sections.tech_stack}
                            icon={Code2}
                            color="blue"
                          />
                          <div className="mt-4 flex flex-wrap gap-2">
                            {techStack.map((tech, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="px-3 py-1.5 text-sm bg-background text-foreground/80 border-border"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Suggestions Section - Only visible to the project owner */}
                    {hasOwnerSuggestions && (
                      <>
                        <Separator />
                        <div>
                          <SectionHeader
                            title={t.overlay.sections.suggestions}
                            icon={Lightbulb}
                            color="blue"
                          />

                          <div className="mt-6 space-y-4">
                            {llm.suggestions?.map((s, i) => (
                              <div
                                key={`suggestion-${i}`}
                                className="flex gap-4 p-4 rounded-xl bg-blue-50/30 border border-blue-100/50 hover:border-blue-200 transition-colors"
                              >
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <Lightbulb className="w-4 h-4" />
                                  </div>
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{s.name}</div>

                                  {s.explanation && (
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                      {s.explanation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    className={cn(
                      "px-6 md:px-10 pb-10",
                      hasOwnerSuggestions ? "border-t border-border/30 mt-6 pt-10" : "pt-4"
                    )}
                  >
                    <CommentSection projectId={project.id} />
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground/80" />
                  <p>{t.overlay.sections.loading_report}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ====================== UI Helpers ====================== */

const StatCard = ({
  icon: Icon,
  label,
  value,
  sublabel,
  color = "green",
}: {
  icon: any;
  label: string;
  value: string | number;
  sublabel: string;
  color?: "green" | "blue" | "orange" | "gray";
}) => {
  const colors = {
    green: "text-primary bg-secondary",
    blue: "text-blue-500 bg-blue-50",
    orange: "text-orange-500 bg-orange-50",
    gray: "text-muted-foreground bg-muted",
  };

  const c = colors[color];

  return (
    <div className="bg-background p-3 md:p-4 rounded-xl border border-border/50 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow min-w-0">
      <div className={`p-2.5 rounded-lg ${c} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl md:text-2xl font-black text-foreground leading-none mb-1 truncate">
          {value}
        </div>
        <div className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wide truncate">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-1 font-medium truncate">
          {sublabel}
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({
  title,
  icon: Icon,
  color = "green",
}: {
  title: string;
  icon?: any;
  color?: "green" | "blue" | "orange" | "purple";
}) => {
  const colorClass = {
    green: "text-primary",
    blue: "text-blue-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
  }[color];

  return (
    <div className="flex items-center gap-2.5">
      {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{title}</h3>
    </div>
  );
};

const Separator = () => <div className="h-px w-full bg-border/50" />;

function humanizeEnum(v: string) {
  return String(v)
    .replace(/_/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const StatusBadge = ({ status, isOwner, t }: { status: string; isOwner: boolean; t: any }) => {
  if (!isOwner && status === "DONE") return null;

  const config: Record<
    string,
    { bg: string; text: string; label: string; animate?: boolean; dotColor?: string }
  > = {
    PENDING: {
      bg: "bg-muted border-border",
      text: "text-muted-foreground",
      label: t.status.PENDING,
      dotColor: "bg-muted-foreground",
    },
    ANALYZING: {
      bg: "bg-secondary border-primary/20",
      text: "text-primary",
      label: t.status.ANALYZING,
      animate: true,
      dotColor: "bg-primary",
    },
    DONE: {
      bg: "bg-secondary border-primary/20",
      text: "text-foreground",
      label: t.status.DONE,
      dotColor: "bg-primary",
    },
    ERROR: {
      bg: "bg-red-50 border-red-100",
      text: "text-red-700",
      label: t.status.ERROR,
      dotColor: "bg-red-500",
    },
    RATE_LIMITED: {
      bg: "bg-amber-50 border-amber-100",
      text: "text-amber-700",
      label: t.status.RATE_LIMITED,
      dotColor: "bg-amber-500",
    },
  };

  const c = config[status] || config.PENDING;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${c.bg} ${c.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${c.dotColor} ${c.animate ? "animate-pulse" : ""}`}
      />
      {c.label}
    </div>
  );
};

const EmptyStateView = ({
  icon: Icon,
  title,
  description,
  color = "gray",
}: {
  icon: any;
  title: string;
  description: string;
  color?: "gray" | "red";
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center bg-background rounded-xl border border-border/50 border-dashed">
    <div
      className={`w-12 h-12 ${color === "red" ? "bg-red-50" : "bg-muted"} rounded-full flex items-center justify-center mb-4`}
    >
      <Icon className={`w-6 h-6 ${color === "red" ? "text-red-500" : "text-muted-foreground"}`} />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-sm">{description}</p>
  </div>
);

const PendingView = ({ onAnalyze, t }: { onAnalyze: () => void; t: any }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center bg-background rounded-2xl border border-border border-dashed shadow-sm">
    <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-6 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
      <Sparkles className="w-10 h-10 text-primary" />
    </div>
    <h3 className="text-2xl font-black text-foreground mb-3">{t.overlay.pending_view.title}</h3>
    <p className="text-muted-foreground text-base mb-10 max-w-md leading-relaxed">
      {t.overlay.pending_view.description}
    </p>
    <button
      onClick={onAnalyze}
      className="px-10 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl transition-all shadow-xl shadow-primary/20 cursor-pointer flex items-center gap-3 text-base active:scale-95"
    >
      <Sparkles className="w-5 h-5" />
      {t.overlay.pending_view.button}
    </button>
  </div>
);

const AnalyzingView = ({ t }: { t: any }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="relative mb-8">
      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-pulse" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-foreground mb-3">{t.overlay.analyzing_view.title}</h3>
    <p className="text-muted-foreground text-base">{t.overlay.analyzing_view.description}</p>
  </div>
);

const ErrorView = ({ onRetry, t }: { onRetry: () => void; t: any }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50/30 rounded-2xl border border-red-100">
    <XCircle className="w-12 h-12 text-red-500 mb-5" />
    <h3 className="text-xl font-bold text-red-900 mb-2">{t.overlay.error_view.title}</h3>
    <p className="text-red-600/80 text-base mb-8">{t.overlay.error_view.description}</p>
    <button
      onClick={onRetry}
      className="px-8 py-3 bg-background border-2 border-red-100 text-red-700 hover:bg-red-50 font-bold rounded-xl transition-all text-base shadow-sm active:scale-95"
    >
      {t.overlay.error_view.button}
    </button>
  </div>
);

const RateLimitedView = ({
  t,
  nextRetryAt,
  isOwner,
}: {
  t: any;
  nextRetryAt: string | null;
  isOwner: boolean;
}) => {
  const scheduledDate = nextRetryAt ? new Date(nextRetryAt) : null;
  const formattedNextRetry =
    scheduledDate && !Number.isNaN(scheduledDate.getTime())
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(scheduledDate)
      : null;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-amber-50/30 rounded-2xl border border-amber-100">
      <Clock className="w-12 h-12 text-amber-500 mb-5" />
      <h3 className="text-xl font-bold text-amber-900 mb-2">{t.overlay.rate_limited_view.title}</h3>
      <p className="text-amber-600/80 text-base max-w-xl">{t.overlay.rate_limited_view.description}</p>
      {isOwner && formattedNextRetry && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-background/80 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="font-semibold">{t.overlay.rate_limited_view.retry_scheduled}</div>
          <div className="mt-1 text-amber-700">{formattedNextRetry}</div>
        </div>
      )}
    </div>
  );
};

const ImageGallery = ({ images }: { images: string[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isZoomed]);

  // Reset active index if images change or current index becomes invalid
  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [images.length, activeIndex]);

  if (!images || images.length === 0) return null;

  const hasMultiple = images.length > 1;

  return (
    <>
      <div className="flex gap-3 w-full">
        {/* Main Featured Image */}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl bg-muted border border-border flex items-center justify-center group cursor-zoom-in",
            hasMultiple ? "flex-1" : "w-full",
            "min-h-[200px] max-h-[400px]"
          )}
          onClick={() => setIsZoomed(true)}
        >
          <img
            src={images[activeIndex]}
            alt={`Project image ${activeIndex + 1}`}
            className="max-w-full max-h-[400px] object-contain transition-all duration-300"
          />
          {/* Zoom hint overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-foreground shadow-lg">
              🔍 Clique para ampliar
            </div>
          </div>
        </div>

        {/* Thumbnail Stack */}
        {hasMultiple && (
          <div className="flex flex-col gap-2 shrink-0">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer",
                  activeIndex === idx
                    ? "border-primary ring-2 ring-primary/20 scale-105"
                    : "border-border hover:border-border/80 opacity-70 hover:opacity-100"
                )}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      {isZoomed &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/99 flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => setIsZoomed(false)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-50"
              onClick={() => setIsZoomed(false)}
            >
              <XCircle className="w-8 h-8" />
            </button>

            {/* Navigation arrows */}
            {hasMultiple && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                  }}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                  }}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Zoomed image */}
            <img
              src={images[activeIndex]}
              alt={`Project image ${activeIndex + 1}`}
              className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image counter */}
            {hasMultiple && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium border border-white/20">
                {activeIndex + 1} / {images.length}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
