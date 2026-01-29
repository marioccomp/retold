"use client";
import { useState, useEffect, useRef } from "react";

import {
  Code2,
  Github,
  Clock,
  XCircle,
  Sparkles,
  Loader2,
  Package,
  FileCode,
  Shield,
  FolderTree,
  Code,
  PackageSearch,
  Settings,
  FileText,
  GitBranch,
  Container,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ProjectForOverlay } from "./types";
import { useProjectAnalysis } from "./hooks/useProjectAnalysis";
import { ProjectSettings } from "./components/ProjectSettings";
import { useTranslation } from "@/src/i18n/client";
import { incrementView } from "@/src/domains/project/actions/increment-view.action";
import { useQueryClient, useQuery } from "@tanstack/react-query";

type FeedProjectPanelProps = {
  project: ProjectForOverlay;
  onClose: () => void;
};

export function FeedProjectPanel({ project, onClose }: FeedProjectPanelProps) {
  const { dict } = useTranslation();
  const t = dict.project;
  const { data: session } = useSession();
  const repo = project.repository;

  const hasIncremented = useRef(false);

  useEffect(() => {
    if (!hasIncremented.current) {
      incrementView(project.id);
      hasIncremented.current = true;
    }
  }, [project.id]);

  const isOwner = session?.user?.id && project.userId && Number(session.user.id) === project.userId;

  const { status, analysis, data, handleAnalyzeRepo } = useProjectAnalysis(project);

  const queryClient = useQueryClient();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col w-full">
      <style jsx global>{`
        .scrollbar-fintech::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-fintech::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-fintech::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .scrollbar-fintech::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>

      {/* Header - Centered & Modern */}
      <div className="p-8 md:p-12 border-b border-gray-100 bg-white relative">
        {/* Absolute Layout for Status and Settings */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <StatusBadge status={status || "PENDING"} isOwner={!!isOwner} t={t} />
          {isOwner && (
            <ProjectSettings
              project={{
                ...project,
                ownerUsername: project.owner?.username,
              }}
              onDelete={onClose}
              triggerClassName="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100"
            />
          )}
        </div>

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="flex-1 w-full flex flex-col items-center">
            {/* New Premium Icon Style */}
            <div className="mb-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white to-gray-50 flex items-center justify-center border-2 border-[#05dc7f]/30 shadow-2xl shadow-[#05dc7f]/10 shrink-0 transform rotate-6 hover:rotate-0 transition-all duration-500 group/icon">
                <PackageSearch className="w-10 h-10 text-[#05dc7f] group-hover/icon:scale-110 transition-transform duration-300" />
              </div>
            </div>

            <div className="flex flex-col items-center w-full max-w-full overflow-hidden">
              <h2 className="m-0 text-2xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight break-all whitespace-pre-wrap line-clamp-3 overflow-hidden w-full">
                {project.title}
              </h2>
              {repo && !repo.private && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#05dc7f] font-medium transition-colors duration-200 mt-3"
                >
                  <Github className="w-4 h-4" />
                  <span>{repo.fullName}</span>
                </a>
              )}
            </div>

            {/* Owner Info shadow-sm */}
            {project.owner && (
              <Link
                href={`/${project.owner.username}`}
                className="inline-flex items-center gap-2 group mt-8 mb-8 p-1 pr-4 rounded-full bg-gray-50 border border-gray-100 hover:border-[#05dc7f]/30 hover:bg-white transition-all duration-300"
              >
                <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                  <AvatarImage src={project.owner.image || undefined} />
                  <AvatarFallback className="text-[12px] bg-[#05dc7f]/10 text-[#0f2f28] font-bold">
                    {project.owner.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
                  {project.owner.name}
                </span>
              </Link>
            )}

            {project.description && (
              <p className="text-base sm:text-xl text-gray-600 leading-relaxed max-w-2xl w-full font-normal break-all whitespace-pre-wrap mx-auto text-left py-4 border-l-2 border-[#05dc7f]/10 pl-6 max-[650px]:text-[15px] max-[650px]:pl-4">
                {project.description}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-16 mt-8 sm:mt-12 pt-8 sm:pt-10 border-t border-gray-100 w-full">
              {data.summary?.primaryLanguage && (
                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {t.metrics.language}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="p-1 sm:p-1.5 rounded-lg bg-green-50/50">
                      <Code className="w-3.5 h-3.5 sm:w-4 h-4 text-[#05dc7f]" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900">
                      {data.summary.primaryLanguage}
                    </span>
                  </div>
                </div>
              )}

              {data.summary?.appType && (
                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {t.metrics.architecture}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="p-1 sm:p-1.5 rounded-lg bg-gray-50">
                      <Package className="w-3.5 h-3.5 sm:w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900">
                      {data.summary.appType}
                    </span>
                  </div>
                </div>
              )}

              {data.stats?.totalFiles && (
                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {t.metrics.complexity}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="p-1 sm:p-1.5 rounded-lg bg-gray-50">
                      <FileText className="w-3.5 h-3.5 sm:w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900">
                      {t.metrics.files.replace("{count}", String(data.stats.totalFiles))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Images Gallery - Full Width & Centered */}
        {project.images && project.images.length > 0 && (
          <div className="mt-16 flex justify-center">
            <div className="w-full max-w-5xl">
              <ProjectImageGallery images={project.images} t={t} />
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="px-8 py-12 bg-gray-50/50">
        <div className="max-w-5xl mx-auto space-y-12">
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

          {status === "DONE" && analysis && (
            <>
              {/* AI Overview */}
              {data.llmOverview && <AIOverviewCard overview={data.llmOverview as string} t={t} />}

              {/* Tech Stack */}
              <TechStackCard
                frameworks={data.stack.frameworks}
                tools={data.stack.tools}
                languages={data.stack.languages}
                t={t}
              />

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.stats && (
                  <FileStatsCard
                    sourceFiles={data.stats.sourceFiles}
                    testFiles={data.stats.testFiles}
                    configFiles={data.stats.configFiles}
                    docsFiles={data.stats.docsFiles}
                    t={t}
                  />
                )}

                {data.infra && (
                  <InfraCard
                    hasCI={data.infra.hasCI}
                    hasDocker={data.infra.hasDocker}
                    hasLint={data.infra.hasLint}
                    hasTests={data.infra.hasTests}
                    t={t}
                  />
                )}
              </div>

              {/* Project Structure */}
              {data.structure && (
                <StructureCard
                  hasSrcFolder={data.structure.hasSrcFolder}
                  hasTestsFolder={data.structure.hasTestsFolder}
                  maxDepth={data.structure.maxDepth}
                  t={t}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===

const StatusBadge = ({ status, isOwner, t }: { status: string; isOwner: boolean; t: any }) => {
  if (!isOwner && status === "DONE") return null;

  const config: Record<
    string,
    { bg: string; text: string; label: string; animate?: boolean; dotColor?: string }
  > = {
    PENDING: {
      bg: "bg-gray-100 border-gray-200",
      text: "text-gray-600",
      label: t.status.PENDING,
      dotColor: "bg-gray-400",
    },
    ANALYZING: {
      bg: "bg-green-50 border-green-100",
      text: "text-[#05dc7f]",
      label: t.status.ANALYZING,
      animate: true,
      dotColor: "bg-[#05dc7f]",
    },
    DONE: {
      bg: "bg-green-50 border-green-100",
      text: "text-[#0f2f28]",
      label: t.status.DONE,
      dotColor: "bg-[#05dc7f]",
    },
    ERROR: {
      bg: "bg-red-50 border-red-100",
      text: "text-red-700",
      label: t.status.ERROR,
      dotColor: "bg-red-500",
    },
  };

  const c = config[status] || config.PENDING;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}
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
  <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100 border-dashed">
    <div
      className={`w-12 h-12 ${color === "red" ? "bg-red-50" : "bg-gray-50"} rounded-full flex items-center justify-center mb-4`}
    >
      <Icon className={`w-6 h-6 ${color === "red" ? "text-red-500" : "text-gray-400"}`} />
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-gray-500 text-sm max-w-sm">{description}</p>
  </div>
);

const PendingView = ({ onAnalyze, t }: { onAnalyze: () => void; t: any }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
    <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mb-6 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
      <Sparkles className="w-10 h-10 text-[#05dc7f]" />
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-3">{t.overlay.pending_view.title}</h3>
    <p className="text-gray-500 text-base mb-10 max-w-md leading-relaxed">
      {t.overlay.pending_view.description}
    </p>
    <button
      onClick={onAnalyze}
      className="px-10 py-4 bg-[#05dc7f] hover:bg-[#03c56f] text-[#0f2f28] font-black rounded-2xl transition-all shadow-xl shadow-[#05dc7f]/20 cursor-pointer flex items-center gap-3 text-base active:scale-95"
    >
      <Sparkles className="w-5 h-5" />
      {t.overlay.pending_view.button}
    </button>
  </div>
);

const AnalyzingView = ({ t }: { t: any }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="relative mb-8">
      <div className="w-16 h-16 rounded-full border-4 border-[#05dc7f]/20 border-t-[#05dc7f] animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#05dc7f] animate-pulse" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{t.overlay.analyzing_view.title}</h3>
    <p className="text-gray-500 text-base">{t.overlay.analyzing_view.description}</p>
  </div>
);

const ErrorView = ({ onRetry, t }: { onRetry: () => void; t: any }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50/30 rounded-2xl border border-red-100">
    <XCircle className="w-12 h-12 text-red-500 mb-5" />
    <h3 className="text-xl font-bold text-red-900 mb-2">{t.overlay.error_view.title}</h3>
    <p className="text-red-600/80 text-base mb-8">{t.overlay.error_view.description}</p>
    <button
      onClick={onRetry}
      className="px-8 py-3 bg-white border-2 border-red-100 text-red-700 hover:bg-red-50 font-bold rounded-xl transition-all text-base shadow-sm active:scale-95"
    >
      {t.overlay.error_view.button}
    </button>
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-3 mb-8">
    <div className="p-2 rounded-xl bg-green-50">
      <Icon className="w-5 h-5 text-[#05dc7f]" />
    </div>
    <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">{title}</h3>
  </div>
);

const AIOverviewCard = ({ overview, t }: { overview: string; t: any }) => (
  <div className="bg-white rounded-2xl border border-green-100/50 p-10 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Sparkles className="w-24 h-24 text-[#05dc7f]" />
    </div>
    <SectionHeader icon={Sparkles} title={t.overlay.sections.summary} />
    <div className="text-gray-600 prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-p:leading-relaxed prose-li:text-gray-600">
      <ReactMarkdown
        components={{
          h1: () => null,
          h2: () => null,
          h3: ({ children }) => (
            <h4 className="text-gray-900 font-bold mt-8 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-6 text-[16px] font-normal text-gray-600 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => <ul className="space-y-3 mb-6 ml-0 list-none">{children}</ul>,
          li: ({ children }) => (
            <li className="flex items-start gap-4 text-[15px]">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#05dc7f] shrink-0" />
              <span className="flex-1 text-gray-600 leading-relaxed">{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
          blockquote: ({ children }) => (
            <div className="border-l-4 border-[#05dc7f] pl-6 my-6 italic text-gray-500 text-[15px] bg-gray-50/80 py-4 rounded-r-xl">
              {children}
            </div>
          ),
        }}
      >
        {overview}
      </ReactMarkdown>
    </div>
  </div>
);

const TechStackCard = ({
  frameworks,
  tools,
  languages,
  t,
}: {
  frameworks: string[];
  tools: string[];
  languages: string[];
  t: any;
}) => {
  if (!frameworks.length && !tools.length && !languages.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
      <SectionHeader icon={Package} title={t.overlay.sections.tech_stack} />
      <div className="flex flex-wrap gap-3">
        {frameworks.map((fw, i) => (
          <span
            key={`fw-${i}`}
            className="px-4 py-2 bg-green-50 text-[#0f2f28] rounded-xl text-sm font-bold border border-green-100/50 hover:scale-105 transition-transform cursor-default"
          >
            {fw}
          </span>
        ))}
        {languages.map((lang, i) => (
          <span
            key={`lang-${i}`}
            className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold border border-gray-200/50 hover:scale-105 transition-transform cursor-default"
          >
            {lang}
          </span>
        ))}
        {tools.map((tool, i) => (
          <span
            key={`tool-${i}`}
            className="px-4 py-2 bg-white text-gray-500 rounded-xl text-sm font-bold border border-gray-200 hover:scale-105 transition-transform cursor-default"
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
};

const FileStatsCard = ({
  sourceFiles,
  testFiles,
  configFiles,
  docsFiles,
  t,
}: {
  sourceFiles: number;
  testFiles: number;
  configFiles: number;
  docsFiles: number;
  t: any;
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm h-full">
    <SectionHeader icon={FileCode} title={t.overlay.sections.files} />
    <div className="grid grid-cols-2 gap-x-8 gap-y-10 mt-4">
      <StatItem label={t.overlay.stats.source} value={sourceFiles} />
      <StatItem label={t.overlay.stats.tests} value={testFiles} />
      <StatItem label={t.overlay.stats.config} value={configFiles} />
      <StatItem label={t.overlay.stats.docs} value={docsFiles} />
    </div>
  </div>
);

const StatItem = ({ label, value }: { label: string; value: number }) => (
  <div className="group">
    <dt className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-2 group-hover:text-[#05dc7f] transition-colors">
      {label}
    </dt>
    <dd className="text-3xl font-black text-gray-900 tracking-tight">{value}</dd>
  </div>
);

const InfraCard = ({
  hasCI,
  hasDocker,
  hasLint,
  hasTests,
  t,
}: {
  hasCI: boolean;
  hasDocker: boolean;
  hasLint: boolean;
  hasTests: boolean;
  t: any;
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm h-full">
    <SectionHeader icon={Shield} title={t.overlay.sections.infra} />
    <div className="grid grid-cols-1 gap-4">
      <InfraRow label={t.overlay.infra.ci_cd} has={hasCI} t={t} />
      <InfraRow label={t.overlay.infra.docker} has={hasDocker} t={t} />
      <InfraRow label={t.overlay.infra.lint} has={hasLint} t={t} />
      <InfraRow label={t.overlay.infra.tests} has={hasTests} t={t} />
    </div>
  </div>
);

const InfraRow = ({ label, has, t }: { label: string; has: boolean; t: any }) => (
  <div className="flex items-center justify-between py-2 group">
    <span className="text-[15px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
      {label}
    </span>
    {has ? (
      <div className="flex items-center gap-2 text-[#0f2f28] text-[11px] font-black uppercase tracking-wider bg-green-50 px-3 py-1.5 rounded-lg border border-green-100/50">
        <CheckCircle2 className="w-4 h-4 text-[#05dc7f]" />
        <span>{t.overlay.infra.active}</span>
      </div>
    ) : (
      <span className="text-[11px] text-gray-400 font-bold px-3 py-1.5 uppercase tracking-wider">
        {t.overlay.infra.missing}
      </span>
    )}
  </div>
);

const StructureCard = ({
  hasSrcFolder,
  hasTestsFolder,
  maxDepth,
  t,
}: {
  hasSrcFolder: boolean;
  hasTestsFolder: boolean;
  maxDepth: number;
  t: any;
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
    <SectionHeader icon={FolderTree} title={t.overlay.sections.structure} />
    <div className="flex flex-wrap gap-12 mt-4">
      <StructureItem
        label={t.overlay.structure.src}
        value={hasSrcFolder ? t.overlay.structure.present : t.overlay.structure.missing}
        highlight={hasSrcFolder}
      />
      <StructureItem
        label={t.overlay.structure.tests}
        value={hasTestsFolder ? t.overlay.structure.present : t.overlay.structure.missing}
        highlight={hasTestsFolder}
      />
      <StructureItem
        label={t.overlay.structure.depth}
        value={maxDepth.toString()}
        highlight={false}
      />
    </div>
  </div>
);

const StructureItem = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight: boolean;
}) => (
  <div>
    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-2">
      {label}
    </div>
    <div className={`text-xl font-black ${highlight ? "text-gray-900" : "text-gray-400"}`}>
      {value}
    </div>
  </div>
);

const ProjectImageGallery = ({ images, t }: { images: string[]; t: any }) => {
  const [activeImage, setActiveImage] = useState(images[0]);

  useEffect(() => {
    if (images && images.length > 0) {
      setActiveImage(images[0]);
    }
  }, [images]);

  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-2xl relative aspect-video bg-gray-50 group">
        <img
          src={images[0]}
          alt={t.overlay.gallery.alt_preview}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
      <style jsx>{`
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* Main Image Area */}
      <div className="md:col-span-3">
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-gray-100 bg-gray-50 shadow-2xl group">
          <img
            key={activeImage}
            src={activeImage}
            alt={t.overlay.gallery.alt_active}
            className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Thumbnails Sidebar - Grid on mobile, Column on desktop */}
      <div className="md:col-span-1 grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-col gap-3 md:gap-4 overflow-y-auto md:max-h-[500px] hide-scroll">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setActiveImage(img)}
            className={`relative aspect-video w-full flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
              activeImage === img
                ? "border-[#05dc7f] shadow-lg shadow-[#05dc7f]/20 scale-105"
                : "border-transparent opacity-50 hover:opacity-100 hover:scale-[1.02]"
            }`}
          >
            <img
              src={img}
              alt={t.overlay.gallery.alt_index.replace("{index}", String(index + 1))}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
