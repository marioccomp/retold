"use client";

import { Code2, Github, Clock, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

import { ProjectForOverlay } from "./types";
import { useProjectAnalysis } from "./hooks/useProjectAnalysis";
import { getStatusConfig } from "./components/status-config";
import { AnalyzingView, ErrorView, PendingView } from "./components/StatusViews";
import { AIOverview } from "./components/AIOverview";
import { KeyMetrics } from "./components/KeyMetrics";
import { TechStack } from "./components/TechStack";
import { FileStatistics } from "./components/FileStatistics";
import { Infrastructure } from "./components/Infrastructure";
import { ProjectStructure } from "./components/ProjectStructure";
import { ProjectSettings } from "./components/ProjectSettings";

type ProjectPanelProps = {
    project: ProjectForOverlay;
    onClose: () => void;
};

export function ProjectPanel({ project, onClose }: ProjectPanelProps) {
    const { data: session } = useSession();
    const repo = project.repository;

    // Check if the current user is the owner
    const isOwner = session?.user?.id && project.userId && Number(session.user.id) === project.userId;

    const {
        status,
        analysis,
        data,
        handleAnalyzeRepo
    } = useProjectAnalysis(project);

    const statusConfig = getStatusConfig(status);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="bg-white rounded-2xl border border-[#e7eae9] shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#04a660] to-[#037d45] px-7 py-6 text-white flex justify-between items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Code2 className="w-6 h-6" />
                        <h2 className="m-0 text-2xl font-bold text-white drop-shadow-md">{project.title}</h2>
                    </div>

                    {repo && (
                        <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-white/90 no-underline transition-colors duration-200 hover:text-white hover:underline"
                        >
                            <Github className="w-4 h-4" />
                            <span>{repo.fullName}</span>
                        </a>
                    )}

                    {project.description && (
                        <p className="mt-3 text-sm text-white leading-relaxed font-medium drop-shadow-sm">{project.description}</p>
                    )}
                </div>

                <div className="flex flex-col items-end gap-3">
                    {/* Status Badge */}
                    {(!isOwner && status === "DONE") ? null : (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.85rem] font-medium backdrop-blur-md whitespace-nowrap ${statusConfig.badgeClass ?? "bg-white/15"}`}>
                            <StatusIcon className={status === "ANALYZING" ? "animate-spin" : ""} />
                            <span>{statusConfig.text}</span>
                        </div>
                    )}

                    {isOwner && (
                        <ProjectSettings
                            project={project}
                            onDelete={onClose}
                            triggerClassName="p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full transition-all text-white shadow-lg border border-white/10 focus:outline-none outline-none focus-visible:ring-0 cursor-pointer"
                        />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-7 py-6">
                {status === "PENDING" && (
                    isOwner ? (
                        <PendingView onAnalyze={handleAnalyzeRepo} />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Not Available</h3>
                            <p className="text-gray-600">The owner hasn't started the analysis for this project yet.</p>
                        </div>
                    )
                )}

                {status === "ANALYZING" && <AnalyzingView />}

                {status === "ERROR" && (
                    isOwner ? (
                        <ErrorView onRetry={handleAnalyzeRepo} />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Error</h3>
                            <p className="text-gray-600">There was an error during the analysis of this project.</p>
                        </div>
                    )
                )}

                {status === "DONE" && analysis && (
                    <div className="flex flex-col gap-5">
                        {/* AI Overview */}
                        {data.llmOverview && <AIOverview overview={data.llmOverview} />}

                        {/* Key Metrics */}
                        <KeyMetrics
                            primaryLanguage={data.summary?.primaryLanguage}
                            appType={data.summary?.appType}
                            totalFiles={data.stats?.totalFiles}
                            maxDepth={data.structure?.maxDepth}
                        />

                        {/* Tech Stack */}
                        <TechStack
                            frameworks={data.stack.frameworks}
                            tools={data.stack.tools}
                            languages={data.stack.languages}
                        />

                        {/* Stats & Infrastructure */}
                        <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
                            {/* File Statistics */}
                            {data.stats && (
                                <FileStatistics
                                    sourceFiles={data.stats.sourceFiles}
                                    testFiles={data.stats.testFiles}
                                    configFiles={data.stats.configFiles}
                                    docsFiles={data.stats.docsFiles}
                                />
                            )}

                            {/* Infrastructure */}
                            {data.infra && (
                                <Infrastructure
                                    hasCI={data.infra.hasCI}
                                    hasDocker={data.infra.hasDocker}
                                    hasLint={data.infra.hasLint}
                                    hasTests={data.infra.hasTests}
                                />
                            )}
                        </div>

                        {/* Project Structure */}
                        {data.structure && (
                            <ProjectStructure
                                hasSrcFolder={data.structure.hasSrcFolder}
                                hasTestsFolder={data.structure.hasTestsFolder}
                                maxDepth={data.structure.maxDepth}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
