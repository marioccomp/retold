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
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Project overview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      This project demonstrates practical usage of modern web development tools and
                      patterns.
                    </p>
                    <p>
                      Focus areas include maintainability, scalability and developer experience.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tech stack</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {stack.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* STATS */}
            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                  <Card key={stat.label}>
                    <CardHeader>
                      <CardTitle className="text-base">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <p className="font-medium">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {skillInsights.map((skill) => (
                  <Card key={skill.title}>
                    <CardHeader>
                      <CardTitle className="text-base">{skill.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge>{skill.level}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ANALYSIS */}
            <TabsContent value="analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Repository insights</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• Clear folder structure</p>
                    <p>• Logical separation of concerns</p>
                    <p>• Good usage of modern frameworks</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Suggested improvements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {improvements.map((item, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {item}
                      </div>
                    ))}
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
