"use client";

import { useState } from "react";
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
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const appSlug = "retold-inc";
  const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: () => getRepositoriesAction(),
  });

  function openCenteredPopupAndRefetch(
    url: string,
    queryClient: QueryClient,
    queryKey: string[],
    title = "GitHub",
    w = 600,
    h = 700
  ) {
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;

    const left = width / 2 - w / 2 + dualScreenLeft;
    const top = height / 2 - h / 2 + dualScreenTop;

    const popup = window.open(
      url,
      title,
      `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`
    );

    if (!popup) return;

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);

        // 🔥 força refetch dos repositórios
        queryClient.invalidateQueries({ queryKey });
      }
    }, 500);
  }

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
            <Input placeholder="Project title" />

            <Textarea placeholder="Short description" className="resize-none" />

            <Select defaultValue="public">
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
                  {repositories.map((repo) => (
                    <li
                      key={repo.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{repo.name}</span>
                      <Button className="cursor-pointer" size="sm" variant="outline">
                        Select
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No repositories connected.</p>
              )}

              <Button
                variant="secondary"
                className="w-full cursor-pointer"
                onClick={() => {
                  openCenteredPopupAndRefetch(installUrl, queryClient, ["repositories"]);
                }}
              >
                Add repositories
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing projects (placeholder) */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Your projects</h2>

        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">No projects yet.</CardContent>
        </Card>
      </div>
    </div>
  );
}
