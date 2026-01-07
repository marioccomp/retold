"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRepositoriesAction } from "./actions/get-user-repositories.action";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import verifyUserInstallation from "./actions/verify-user-instalation.action";
import { createProjectAction } from "./actions/create-project.action";
import { getUserProjectsAction } from "./actions/get-user-project.action";
import { ProjectOverlay } from "./components/ProjectOverlay";

import type { ProjectDTO } from "@/src/domains/project/dtos/project.dto";

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  async function handleCreateProject() {
    try {
      await createProjectAction({
        title,
        description,
        visibility,
        repositoryId: selectedRepoId!,
      });

      setShowForm(false);
      setTitle("");
      setDescription("");
      setSelectedRepoId(null);

      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "GITHUB_APP_REPOSITORIES_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["repositories"] });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  const appSlug = "retold-inc";
  const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: () => getRepositoriesAction(),
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ProjectDTO[]>({
    queryKey: ["projects"],
    queryFn: () => getUserProjectsAction(),
  });

  function openCenteredPopup(url: string, title = "GitHub", w = 600, h = 700) {
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;

    const left = width / 2 - w / 2 + dualScreenLeft;
    const top = height / 2 - h / 2 + dualScreenTop;

    window.open(url, title, `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`);
  }

  const handleAddRepository = () => {
    if (repositories.length === 0) {
      verifyUserInstallation();
    }

    openCenteredPopup(installUrl);
  };

  const mockAnalysis = {
    llm: {
      overview: "Projeto bem estruturado, com separação clara entre código-fonte e configurações.",
    },
    summary: {
      primaryLanguage: "TypeScript",
      appType: "fullstack",
    },
    stack: {
      languages: ["TypeScript", "JavaScript"],
      frameworks: ["Next.js", "React"],
      tools: ["ESLint", "Prettier", "Jest"],
    },
    infra: {
      hasDocker: true,
      hasCI: true,
      hasLint: true,
      hasTests: true,
    },
    stats: {
      totalFiles: 128,
      sourceFiles: 74,
      testFiles: 18,
      configFiles: 22,
      docsFiles: 14,
    },
    structure: {
      hasSrcFolder: true,
      hasTestsFolder: true,
      maxDepth: 6,
    },
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button className="cursor-pointer" onClick={() => setShowForm((prev) => !prev)}>
          New project
        </Button>
      </div>

      {/* New Project Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create new project</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Textarea
              placeholder="Short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />

            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "private")}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="cursor-pointer" value="public">
                  Public
                </SelectItem>
                <SelectItem className="cursor-pointer" value="private">
                  Private
                </SelectItem>
              </SelectContent>
            </Select>

            <Separator />

            {/* Repositories */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Repositories</p>

              {repositories.length > 0 ? (
                <ul className="space-y-2">
                  {repositories.map((repo) => {
                    const isSelected = selectedRepoId === repo.id;

                    return (
                      <li
                        key={repo.id}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                          isSelected ? "border-primary bg-muted" : ""
                        }`}
                      >
                        <span>{repo.name}</span>

                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => setSelectedRepoId(repo.id)}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No repositories connected.</p>
              )}

              <Button
                variant="secondary"
                className="w-full cursor-pointer"
                onClick={handleAddRepository}
              >
                {repositories.length > 0 ? "Add/Remove repositories" : "Add repositories"}
              </Button>
              <Button
                className="w-full"
                disabled={!title || !description || !selectedRepoId}
                onClick={handleCreateProject}
              >
                Add project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing projects (placeholder) */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Your projects</h2>

        {isLoadingProjects ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Loading projects...
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              No projects yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const analysis = mockAnalysis;

              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50 transition"
                  onClick={() => setSelectedProject(project)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span>{project.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {analysis.summary.primaryLanguage} · {analysis.summary.appType}
                        </span>
                      </div>

                      <span className="text-xs text-muted-foreground capitalize">{visibility}</span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{project.description}</p>

                    {/* Stack */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {analysis.stack.frameworks.map((fw) => (
                        <span key={fw} className="rounded-md bg-muted px-2 py-0.5">
                          {fw}
                        </span>
                      ))}
                    </div>

                    {/* Infra flags */}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>CI: {analysis.infra.hasCI ? "✓" : "–"}</span>
                      <span>Tests: {analysis.infra.hasTests ? "✓" : "–"}</span>
                      <span>Lint: {analysis.infra.hasLint ? "✓" : "–"}</span>
                      <span>Docker: {analysis.infra.hasDocker ? "✓" : "–"}</span>
                    </div>

                    {/* Stats */}
                    <div className="text-xs text-muted-foreground">
                      {analysis.stats.sourceFiles} src · {analysis.stats.testFiles} tests ·{" "}
                      {analysis.stats.configFiles} config
                    </div>

                    {/* Repo */}
                    {project.repository && project.repository.isActive ? (
                      <a
                        href={project.repository.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {project.repository.fullName}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Repository unavailable</span>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Created at {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {selectedProject && (
        <ProjectOverlay project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
}
