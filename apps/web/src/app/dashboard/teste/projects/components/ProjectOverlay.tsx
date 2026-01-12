"use client";

import { ProjectDTO } from "@/src/domains/project/dtos/project.dto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Github,
  Code2,
  FileCode,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FolderTree,
  TestTube,
  Settings,
  FileText,
  Container,
  GitBranch,
  Shield,
  Sparkles,
} from "lucide-react";
import { getProjectAnalysisAction } from "../actions/get-project-analysis.action";
import { startProjectAnalysisAction } from "../actions/start-project-analysis.action";
import { toast } from "sonner";

type ProjectOverlayProps = {
  project: ProjectDTO;
  repo?: ProjectDTO["repository"];
  onClose: () => void;
};

export default function ProjectOverlay({ project, onClose }: ProjectOverlayProps) {
  const repo = project.repository;
  const queryClient = useQueryClient();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["project-analysis", project.id],
    queryFn: () => getProjectAnalysisAction(project.id),
    enabled: true, // ou !!project.id
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "ANALYZING" || status === "PENDING") return 2000; // 2s
      return false; // DONE/ERROR/null -> para
    },
  });

  const handleAnalyzeRepo = async () => {
    try {
      const result = await startProjectAnalysisAction(project.id);
      if (result.queued) {
        toast.success("Analysis started");
        refetch();
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      } else {
        toast.error("Failed to start analysis");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to start analysis");
    }
  };

  // status atual (preferir o retornado do server)
  const status = data?.status ?? project.status;
  const analysis = data?.analysis ?? null;
  const rawAnalysis = (analysis as any)?.rawAnalysis ?? null;

  const llmOverview = analysis?.llmOverview ?? null;
  const summary = rawAnalysis?.summary ?? null;
  const stack = rawAnalysis?.stack ?? analysis?.stack ?? null;
  const stats = rawAnalysis?.stats ?? null;
  const infra = rawAnalysis?.infra ?? analysis?.signals ?? null;
  const structure = rawAnalysis?.structure ?? analysis?.structure ?? null;

  const frameworks: string[] = (stack?.frameworks ?? []) as string[];
  const tools: string[] = (stack?.tools ?? []) as string[];
  const languages: string[] = (stack?.languages ?? []) as string[];

  const statusConfig = {
    PENDING: { icon: Clock, text: "Pending Analysis", color: "text-gray-500", bg: "bg-gray-100" },
    ANALYZING: {
      icon: Loader2,
      text: "Analyzing...",
      color: "text-[#05dc7f]",
      bg: "bg-[#05dc7f]/10",
    },
    DONE: {
      icon: CheckCircle2,
      text: "Analysis Complete",
      color: "text-[#047857]",
      bg: "bg-[#a7f3d0]/30",
    },
    ERROR: { icon: XCircle, text: "Analysis Failed", color: "text-red-500", bg: "bg-red-100" },
  } as const;

  const currentStatus = statusConfig[status as keyof typeof statusConfig];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#05dc7f] to-[#047857] p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="pr-12">
            <div className="flex items-center gap-3 mb-2">
              <Code2 className="w-6 h-6" />
              <h2 className="text-2xl font-bold">{project.title}</h2>
            </div>

            {repo && (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
              >
                <Github className="w-4 h-4" />
                <span className="group-hover:underline">{repo.fullName}</span>
              </a>
            )}

            {project.description && (
              <p className="mt-3 text-white/90 text-sm">{project.description}</p>
            )}
          </div>

          {/* Status Badge */}
          <div className="absolute top-6 right-16 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <StatusIcon className={`w-4 h-4 ${status === "ANALYZING" ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">{currentStatus.text}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {status === "PENDING" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Start the analysis to get insights about your project's structure, tech stack, and
                code quality.
              </p>
              <button
                onClick={handleAnalyzeRepo}
                className="px-6 py-3 bg-[#05dc7f] hover:bg-[#04c370] text-white font-medium rounded-lg transition-colors"
              >
                Start Analysis
              </button>
            </div>
          )}

          {status === "ANALYZING" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#05dc7f] animate-spin mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Repository</h3>
              <p className="text-gray-600">Please wait while we analyze your project...</p>
            </div>
          )}

          {status === "ERROR" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h3>
              <p className="text-gray-600 mb-6">
                There was an error analyzing your project. Please try again.
              </p>
              <button
                onClick={handleAnalyzeRepo}
                className="px-6 py-3 bg-[#05dc7f] hover:bg-[#04c370] text-white font-medium rounded-lg transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {status === "DONE" && analysis && (
            <div className="space-y-6">
              {/* AI Overview */}
              {llmOverview && (
                <div className="bg-gradient-to-br from-[#a7f3d0]/20 to-white border border-[#05dc7f]/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-[#047857]" />
                    <h3 className="text-lg font-semibold text-gray-900">AI Overview</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{llmOverview}</p>
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {summary?.primaryLanguage && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-sm mb-1">Primary Language</div>
                    <div className="text-xl font-bold text-gray-900">{summary.primaryLanguage}</div>
                  </div>
                )}
                {summary?.appType && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-sm mb-1">App Type</div>
                    <div className="text-xl font-bold text-gray-900">{summary.appType}</div>
                  </div>
                )}
                {stats?.totalFiles && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-sm mb-1">Total Files</div>
                    <div className="text-xl font-bold text-gray-900">{stats.totalFiles}</div>
                  </div>
                )}
                {structure?.maxDepth && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-600 text-sm mb-1">Max Depth</div>
                    <div className="text-xl font-bold text-gray-900">{structure.maxDepth}</div>
                  </div>
                )}
              </div>

              {/* Tech Stack */}
              {(frameworks.length > 0 || tools.length > 0 || languages.length > 0) && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-[#047857]" />
                    <h3 className="text-lg font-semibold text-gray-900">Tech Stack</h3>
                  </div>

                  <div className="space-y-4">
                    {frameworks.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Frameworks</div>
                        <div className="flex flex-wrap gap-2">
                          {frameworks.map((fw, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-[#05dc7f]/10 text-[#047857] rounded-lg text-sm font-medium"
                            >
                              {fw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {tools.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Tools</div>
                        <div className="flex flex-wrap gap-2">
                          {tools.map((tool, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {languages.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Languages</div>
                        <div className="flex flex-wrap gap-2">
                          {languages.map((lang, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Project Stats & Infrastructure */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* File Statistics */}
                {stats && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileCode className="w-5 h-5 text-[#047857]" />
                      <h3 className="text-lg font-semibold text-gray-900">File Statistics</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          Source Files
                        </span>
                        <span className="font-semibold text-gray-900">{stats.sourceFiles}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <TestTube className="w-4 h-4" />
                          Test Files
                        </span>
                        <span className="font-semibold text-gray-900">{stats.testFiles}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Config Files
                        </span>
                        <span className="font-semibold text-gray-900">{stats.configFiles}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Docs Files
                        </span>
                        <span className="font-semibold text-gray-900">{stats.docsFiles}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Infrastructure */}
                {infra && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-[#047857]" />
                      <h3 className="text-lg font-semibold text-gray-900">Infrastructure</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          CI/CD Pipeline
                        </span>
                        {infra.hasCI ? (
                          <CheckCircle2 className="w-5 h-5 text-[#047857]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Container className="w-4 h-4" />
                          Docker Support
                        </span>
                        {infra.hasDocker ? (
                          <CheckCircle2 className="w-5 h-5 text-[#047857]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Code Linting
                        </span>
                        {infra.hasLint ? (
                          <CheckCircle2 className="w-5 h-5 text-[#047857]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <TestTube className="w-4 h-4" />
                          Test Suite
                        </span>
                        {infra.hasTests ? (
                          <CheckCircle2 className="w-5 h-5 text-[#047857]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Project Structure */}
              {structure && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderTree className="w-5 h-5 text-[#047857]" />
                    <h3 className="text-lg font-semibold text-gray-900">Project Structure</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {structure.hasSrcFolder ? "Yes" : "No"}
                      </div>
                      <div className="text-sm text-gray-600">/src Folder</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {structure.hasTestsFolder ? "Yes" : "No"}
                      </div>
                      <div className="text-sm text-gray-600">Tests Folder</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {structure.maxDepth}
                      </div>
                      <div className="text-sm text-gray-600">Max Depth</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
