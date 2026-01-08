"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ProjectDTO } from "@/src/domains/project/dtos/project.dto";
import { toast } from "sonner";
import { startProjectAnalysisAction } from "../actions/start-project-analysis.action";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjectAnalysisAction } from "../actions/get-project-analysis.action";

type ProjectOverlayProps = {
  project: ProjectDTO;
  repo?: ProjectDTO["repository"];
  onClose: () => void;
};

export function ProjectOverlay({ project, onClose }: ProjectOverlayProps) {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-8 py-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">{project.title}</h2>

            {repo && (
              <a
                href={`https://github.com/${repo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {repo.fullName}
              </a>
            )}

            <p className="text-sm text-muted-foreground max-w-2xl">
              {project.description || "No description provided."}
            </p>
          </div>

          <Button size="icon" className="cursor-pointer" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <Button onClick={() => handleAnalyzeRepo()} disabled={status === "ANALYZING"}>
            {status === "ANALYZING" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze repo"}
          </Button>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger className="cursor-pointer" value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="stats">
                Stats
              </TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="analysis">
                Repo analysis
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LLM Overview */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>LLM overview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-3">
                    <p>
                      {llmOverview ??
                        (isFetching
                          ? "Loading analysis…"
                          : "No analysis yet. Click “Analyze repo”.")}
                    </p>

                    <div className="flex gap-2 pt-2">
                      <Badge variant="secondary">{summary?.primaryLanguage ?? "—"}</Badge>
                      <Badge variant="secondary">
                        {summary?.appType ?? analysis?.appType ?? "—"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Stack */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tech stack</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {frameworks.map((fw: string) => (
                      <Badge key={fw} variant="secondary">
                        {fw}
                      </Badge>
                    ))}
                    {tools.map((tool: string) => (
                      <Badge key={tool} variant="outline">
                        {tool}
                      </Badge>
                    ))}
                    {!frameworks.length && !tools.length && (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* STATS */}
            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Files</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {stats?.totalFiles ?? "—"}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Source</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {stats?.sourceFiles ?? "—"}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tests</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {stats?.testFiles ?? "—"}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Config</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {stats?.configFiles ?? "—"}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Docs</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {stats?.docsFiles ?? "—"}
                  </CardContent>
                </Card>
              </div>

              {/* Infra */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="py-4 text-sm">
                    Docker: {infra?.hasDocker ? "✓" : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-sm">CI: {infra?.hasCI ? "✓" : "—"}</CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-sm">
                    Lint: {infra?.hasLint ? "✓" : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-sm">
                    Tests: {infra?.hasTests ? "✓" : "—"}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ANALYSIS */}
            <TabsContent value="analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Structure */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project structure</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• Uses /src folder: {structure?.hasSrcFolder ? "Yes" : "No"}</p>
                    <p>• Has test folder: {structure?.hasTestsFolder ? "Yes" : "No"}</p>
                    <p>• Max folder depth: {structure?.maxDepth ?? "—"}</p>
                  </CardContent>
                </Card>

                {/* LLM Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle>LLM insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• Good separation of concerns</p>
                    <p>• Consistent naming conventions</p>
                    <p>• Modern framework usage</p>
                    <p>• Test coverage could be improved</p>
                    <p>• CI automation would increase reliability</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
