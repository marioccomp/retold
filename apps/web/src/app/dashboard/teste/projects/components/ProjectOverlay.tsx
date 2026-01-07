"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ProjectDTO } from "@/src/domains/project/dtos/project.dto";

type RepoInfo = {
  full_name: string;
};

type ProjectOverlayProps = {
  project: ProjectDTO;
  repo?: ProjectDTO["repository"];
  onClose: () => void;
};

/**
 * Mock data — futuramente isso vem de uma LLM
 */
const stats = [
  {
    label: "Commit style",
    value: "Mostly semantic",
    description: "Uses feat, fix, chore in most commits",
  },
  {
    label: "Branching",
    value: "Simple",
    description: "Main + feature branches",
  },
  {
    label: "Consistency",
    value: "High",
    description: "Naming patterns and structure are consistent",
  },
];

const stack = ["Next.js", "React", "TypeScript", "TailwindCSS", "Prisma"];

const skillInsights = [
  {
    title: "Code quality",
    level: "Advanced",
  },
  {
    title: "Architecture",
    level: "Intermediate",
  },
  {
    title: "Scalability awareness",
    level: "Intermediate",
  },
];

const improvements = [
  "Increase automated test coverage",
  "Add commit lint + husky",
  "Introduce repository README badges",
  "Add CI pipeline for pull requests",
];

const analysis = {
  llm: {
    overview:
      "This repository shows strong consistency in structure and naming. The project follows modern best practices and demonstrates good separation of concerns. The main improvement opportunity lies in test coverage and CI automation.",
  },
  summary: {
    primaryLanguage: "TypeScript",
    appType: "Fullstack web app",
  },
  stack: {
    languages: ["TypeScript", "JavaScript"],
    frameworks: ["Next.js", "React"],
    tools: ["TailwindCSS", "Prisma", "ESLint", "Jest"],
  },
  infra: {
    hasDocker: true,
    hasCI: false,
    hasLint: true,
    hasTests: true,
  },
  stats: {
    totalFiles: 132,
    sourceFiles: 78,
    testFiles: 16,
    configFiles: 24,
    docsFiles: 14,
  },
  structure: {
    hasSrcFolder: true,
    hasTestsFolder: true,
    maxDepth: 7,
  },
};

export function ProjectOverlay({ project, onClose }: ProjectOverlayProps) {
  const repo = project.repository;
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
                    <p>{analysis.llm.overview}</p>

                    <div className="flex gap-2 pt-2">
                      <Badge variant="secondary">{analysis.summary.primaryLanguage}</Badge>
                      <Badge variant="secondary">{analysis.summary.appType}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Stack */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tech stack</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {analysis.stack.frameworks.map((fw) => (
                      <Badge key={fw} variant="secondary">
                        {fw}
                      </Badge>
                    ))}
                    {analysis.stack.tools.map((tool) => (
                      <Badge key={tool} variant="outline">
                        {tool}
                      </Badge>
                    ))}
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
                    {analysis.stats.totalFiles}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Source</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {analysis.stats.sourceFiles}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tests</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {analysis.stats.testFiles}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Config</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {analysis.stats.configFiles}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Docs</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {analysis.stats.docsFiles}
                  </CardContent>
                </Card>
              </div>

              {/* Infra */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="py-4 text-sm">
                    Docker: {analysis.infra.hasDocker ? "✓" : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-sm">
                    CI: {analysis.infra.hasCI ? "✓" : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-sm">
                    Lint: {analysis.infra.hasLint ? "✓" : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-sm">
                    Tests: {analysis.infra.hasTests ? "✓" : "—"}
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
                    <p>• Uses /src folder: {analysis.structure.hasSrcFolder ? "Yes" : "No"}</p>
                    <p>• Has test folder: {analysis.structure.hasTestsFolder ? "Yes" : "No"}</p>
                    <p>• Max folder depth: {analysis.structure.maxDepth}</p>
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
