"use client";
import { useState, useEffect } from "react";

import { Code2, Github, Clock, XCircle, Sparkles, Loader2, Package, FileCode, Shield, FolderTree, Code, TestTube, Settings, FileText, GitBranch, Container, CheckCircle2, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ProjectForOverlay } from "./types";
import { useProjectAnalysis } from "./hooks/useProjectAnalysis";
import { ProjectSettings } from "./components/ProjectSettings";
import { useTranslation } from "@/src/i18n/client";

type FeedProjectPanelProps = {
    project: ProjectForOverlay;
    onClose: () => void;
};

export function FeedProjectPanel({ project, onClose }: FeedProjectPanelProps) {
    const { dict } = useTranslation();
    const t = dict.project;
    const { data: session } = useSession();
    const repo = project.repository;

    const isOwner = session?.user?.id && project.userId && Number(session.user.id) === project.userId;

    const {
        status,
        analysis,
        data,
        handleAnalyzeRepo
    } = useProjectAnalysis(project);

    console.log(project)

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
            {/* Header - Minimal & Clean */}
            <div className="p-5 md:p-8 border-b border-gray-100 bg-white">
                <div className="flex flex-col md:flex-row items-start md:justify-between gap-6">
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-lg bg-[#33bd19] flex items-center justify-center shadow-md shadow-green-900/5 shrink-0">
                                <Code2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="m-0 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">{project.title}</h2>
                                {repo && (
                                    <a
                                        href={repo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#33bd19] font-medium transition-colors duration-200 mt-1"
                                    >
                                        <Github className="w-3.5 h-3.5" />
                                        <span>{repo.fullName}</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Owner Info */}
                        {project.owner && (
                            <Link
                                href={`/${project.owner.username}`}
                                className="inline-flex items-center gap-2 group mb-4 p-1 pr-3 rounded-full bg-gray-50 border border-gray-100 hover:border-[#33bd19]/30 hover:bg-white transition-all transition-duration-300"
                            >
                                <Avatar className="w-6 h-6 border border-white shadow-sm">
                                    <AvatarImage src={project.owner.image || undefined} />
                                    <AvatarFallback className="text-[10px] bg-[#33bd19]/10 text-[#1d6b22] font-bold">
                                        {project.owner.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
                                    {project.owner.name}
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#33bd19] transition-colors" />
                            </Link>
                        )}

                        {project.description && (
                            <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed max-w-3xl font-normal">
                                {project.description}
                            </p>
                        )}

                        {status === "DONE" && (
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 sm:mt-8 pt-6 border-t border-gray-100">
                                {data.summary?.primaryLanguage && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t.metrics.language}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-green-50">
                                                <Code className="w-3.5 h-3.5 text-[#33bd19]" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">{data.summary.primaryLanguage}</span>
                                        </div>
                                    </div>
                                )}

                                {data.summary?.appType && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t.metrics.architecture}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-gray-50">
                                                <Package className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">{data.summary.appType}</span>
                                        </div>
                                    </div>
                                )}

                                {data.stats?.totalFiles && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t.metrics.complexity}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-gray-50">
                                                <FileText className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">{t.metrics.files.replace("{count}", String(data.stats.totalFiles))}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0">
                        {/* Status Badge */}
                        <div className="order-2 md:order-1">
                            <StatusBadge status={status || "PENDING"} isOwner={!!isOwner} t={t} />
                        </div>

                        {isOwner && (
                            <div className="order-1 md:order-2">
                                <ProjectSettings
                                    project={project}
                                    onDelete={onClose}
                                    triggerClassName="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Project Images Gallery - Full Width & Centered */}
                {project.images && project.images.length > 0 && (
                    <div className="mt-8 flex justify-center">
                        <div className="w-full max-w-5xl">
                            <ProjectImageGallery images={project.images} t={t} />
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="px-8 py-8 bg-gray-50/50">
                <div className="max-w-5xl mx-auto space-y-8">
                    {status === "PENDING" && (
                        isOwner ? (
                            <PendingView onAnalyze={handleAnalyzeRepo} t={t} />
                        ) : (
                            <EmptyStateView
                                icon={Clock}
                                title={t.overlay.analysis_not_started.title}
                                description={t.overlay.analysis_not_started.description}
                            />
                        )
                    )}

                    {status === "ANALYZING" && <AnalyzingView t={t} />}

                    {status === "ERROR" && (
                        isOwner ? (
                            <ErrorView onRetry={handleAnalyzeRepo} t={t} />
                        ) : (
                            <EmptyStateView
                                icon={XCircle}
                                title={t.overlay.analysis_error.title}
                                description={t.overlay.analysis_error.description}
                                color="red"
                            />
                        )
                    )}

                    {status === "DONE" && analysis && (
                        <>
                            {/* AI Overview */}
                            {data.llmOverview && <AIOverviewCard overview={data.llmOverview} t={t} />}

                            {/* Tech Stack */}
                            <TechStackCard
                                frameworks={data.stack.frameworks}
                                tools={data.stack.tools}
                                languages={data.stack.languages}
                                t={t}
                            />

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div >
    );
}

// === Sub-components ===

const StatusBadge = ({ status, isOwner, t }: { status: string; isOwner: boolean; t: any }) => {
    if (!isOwner && status === "DONE") return null;

    const config: Record<string, { bg: string; text: string; label: string; animate?: boolean; dotColor?: string }> = {
        PENDING: { bg: "bg-gray-100 border-gray-200", text: "text-gray-600", label: t.status.PENDING, dotColor: "bg-gray-400" },
        ANALYZING: { bg: "bg-green-50 border-green-100", text: "text-[#33bd19]", label: t.status.ANALYZING, animate: true, dotColor: "bg-[#33bd19]" },
        DONE: { bg: "bg-green-50 border-green-100", text: "text-[#1d6b22]", label: t.status.DONE, dotColor: "bg-[#33bd19]" },
        ERROR: { bg: "bg-red-50 border-red-100", text: "text-red-700", label: t.status.ERROR, dotColor: "bg-red-500" },
    };

    const c = config[status] || config.PENDING;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor} ${c.animate ? 'animate-pulse' : ''}`} />
            {c.label}
        </div>
    );
};

const EmptyStateView = ({ icon: Icon, title, description, color = "gray" }: { icon: any, title: string, description: string, color?: "gray" | "red" }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100 border-dashed">
        <div className={`w-12 h-12 ${color === 'red' ? 'bg-red-50' : 'bg-gray-50'} rounded-full flex items-center justify-center mb-4`}>
            <Icon className={`w-6 h-6 ${color === 'red' ? 'text-red-500' : 'text-gray-400'}`} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm max-w-sm">{description}</p>
    </div>
);

const PendingView = ({ onAnalyze, t }: { onAnalyze: () => void; t: any }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200 border-dashed">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-5">
            <Sparkles className="w-7 h-7 text-[#33bd19]" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t.overlay.pending_view.title}</h3>
        <p className="text-gray-500 text-sm mb-8 max-w-md leading-relaxed">
            {t.overlay.pending_view.description}
        </p>
        <button
            onClick={onAnalyze}
            className="px-6 py-2.5 bg-[#33bd19] hover:bg-[#2ca516] text-white font-medium rounded-lg transition-all shadow-sm shadow-[#33bd19]/20 cursor-pointer flex items-center gap-2 text-sm"
        >
            <Sparkles className="w-4 h-4" />
            {t.overlay.pending_view.button}
        </button>
    </div>
);

const AnalyzingView = ({ t }: { t: any }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-[#33bd19] animate-spin mb-6" />
        <h3 className="text-base font-semibold text-gray-900 mb-2">{t.overlay.analyzing_view.title}</h3>
        <p className="text-gray-500 text-sm">{t.overlay.analyzing_view.description}</p>
    </div>
);

const ErrorView = ({ onRetry, t }: { onRetry: () => void; t: any }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50/30 rounded-xl border border-red-100">
        <XCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-base font-semibold text-red-900 mb-2">{t.overlay.error_view.title}</h3>
        <p className="text-red-600/80 text-sm mb-6">{t.overlay.error_view.description}</p>
        <button
            onClick={onRetry}
            className="px-5 py-2 bg-white border border-red-200 text-red-700 hover:bg-red-50 font-medium rounded-lg transition-colors text-sm"
        >
            {t.overlay.error_view.button}
        </button>
    </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2.5 mb-5">
        <Icon className="w-5 h-5 text-[#33bd19]" />
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{title}</h3>
    </div>
);

const AIOverviewCard = ({ overview, t }: { overview: string; t: any }) => (
    <div className="bg-white rounded-lg border border-green-100/50 p-8 shadow-sm">
        <SectionHeader icon={Sparkles} title={t.overlay.sections.summary} />
        <div className="text-gray-600 prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-p:leading-relaxed prose-li:text-gray-600">
            <ReactMarkdown
                components={{
                    h1: () => null,
                    h2: () => null,
                    h3: ({ children }) => <h4 className="text-gray-900 font-semibold mt-6 mb-3 flex items-center gap-2 text-sm uppercase">{children}</h4>,
                    p: ({ children }) => <p className="mb-4 text-[15px] font-normal text-gray-600">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-2 mb-4 ml-0 list-none">{children}</ul>,
                    li: ({ children }) => (
                        <li className="flex items-start gap-3 text-[14px]">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#33bd19] shrink-0" />
                            <span className="flex-1 text-gray-600 leading-relaxed">{children}</span>
                        </li>
                    ),
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    blockquote: ({ children }) => <div className="border-l-2 border-[#33bd19] pl-4 my-4 italic text-gray-500 text-sm bg-gray-50/50 py-2 rounded-r">{children}</div>,
                }}
            >
                {overview}
            </ReactMarkdown>
        </div>
    </div>
);

const TechStackCard = ({ frameworks, tools, languages, t }: { frameworks: string[]; tools: string[]; languages: string[]; t: any }) => {
    if (!frameworks.length && !tools.length && !languages.length) return null;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <SectionHeader icon={Package} title={t.overlay.sections.tech_stack} />
            <div className="flex flex-wrap gap-2">
                {frameworks.map((fw, i) => (
                    <span key={`fw-${i}`} className="px-3 py-1.5 bg-green-50 text-green-800 rounded-md text-sm font-medium border border-green-100">
                        {fw}
                    </span>
                ))}
                {languages.map((lang, i) => (
                    <span key={`lang-${i}`} className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md text-sm font-medium border border-gray-200">
                        {lang}
                    </span>
                ))}
                {tools.map((tool, i) => (
                    <span key={`tool-${i}`} className="px-3 py-1.5 bg-white text-gray-500 rounded-md text-sm font-medium border border-gray-200">
                        {tool}
                    </span>
                ))}
            </div>
        </div>
    );
};

const FileStatsCard = ({ sourceFiles, testFiles, configFiles, docsFiles, t }: { sourceFiles: number; testFiles: number; configFiles: number; docsFiles: number; t: any }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm h-full">
        <SectionHeader icon={FileCode} title={t.overlay.sections.files} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <StatItem label={t.overlay.stats.source} value={sourceFiles} />
            <StatItem label={t.overlay.stats.tests} value={testFiles} />
            <StatItem label={t.overlay.stats.config} value={configFiles} />
            <StatItem label={t.overlay.stats.docs} value={docsFiles} />
        </div>
    </div>
);

const StatItem = ({ label, value }: { label: string; value: number }) => (
    <div>
        <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</dt>
        <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
    </div>
);

const InfraCard = ({ hasCI, hasDocker, hasLint, hasTests, t }: { hasCI: boolean; hasDocker: boolean; hasLint: boolean; hasTests: boolean; t: any }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm h-full">
        <SectionHeader icon={Shield} title={t.overlay.sections.infra} />
        <div className="grid grid-cols-1 gap-3">
            <InfraRow label={t.overlay.infra.ci_cd} has={hasCI} t={t} />
            <InfraRow label={t.overlay.infra.docker} has={hasDocker} t={t} />
            <InfraRow label={t.overlay.infra.lint} has={hasLint} t={t} />
            <InfraRow label={t.overlay.infra.tests} has={hasTests} t={t} />
        </div>
    </div>
);

const InfraRow = ({ label, has, t }: { label: string; has: boolean; t: any }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600">{label}</span>
        {has ? (
            <div className="flex items-center gap-1.5 text-[#1d6b22] text-xs font-bold uppercase tracking-wider bg-green-50 px-2 py-1 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.overlay.infra.active}</span>
            </div>
        ) : (
            <span className="text-xs text-gray-400 font-medium px-2 py-1">{t.overlay.infra.missing}</span>
        )}
    </div>
);

const StructureCard = ({ hasSrcFolder, hasTestsFolder, maxDepth, t }: { hasSrcFolder: boolean; hasTestsFolder: boolean; maxDepth: number; t: any }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <SectionHeader icon={FolderTree} title={t.overlay.sections.structure} />
        <div className="flex flex-wrap gap-8">
            <StructureItem label={t.overlay.structure.src} value={hasSrcFolder ? t.overlay.structure.present : t.overlay.structure.missing} highlight={hasSrcFolder} />
            <StructureItem label={t.overlay.structure.tests} value={hasTestsFolder ? t.overlay.structure.present : t.overlay.structure.missing} highlight={hasTestsFolder} />
            <StructureItem label={t.overlay.structure.depth} value={maxDepth.toString()} highlight={false} />
        </div>
    </div>
);

const StructureItem = ({ label, value, highlight }: { label: string; value: string; highlight: boolean }) => (
    <div>
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className={`text-sm font-medium ${highlight ? 'text-gray-900' : 'text-gray-600'}`}>{value}</div>
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
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm relative aspect-video bg-gray-100">
                <img
                    src={images[0]}
                    alt={t.overlay.gallery.alt_preview}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
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
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                    <img
                        key={activeImage}
                        src={activeImage}
                        alt={t.overlay.gallery.alt_active}
                        className="w-full h-full object-cover animate-in fade-in duration-300"
                    />
                </div>
            </div>

            {/* Thumbnails Sidebar - Grid on mobile, Column on desktop */}
            <div className="md:col-span-1 grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-col gap-2 md:gap-3 overflow-y-auto md:h-full hide-scroll">
                {images.map((img, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveImage(img)}
                        className={`relative aspect-video w-full flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${activeImage === img
                            ? "border-[#33bd19] shadow-md shadow-green-900/10 scale-[1.02]"
                            : "border-transparent border-gray-100 opacity-70 hover:opacity-100 hover:scale-105"
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
