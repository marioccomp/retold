"use server";

import { auth } from "@/src/domains/auth/auth";
import ProjectsPage from "./ProjectsPage";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getUserRepositories } from "@/src/domains/github/github";
import { getUserProjectsAction } from "./actions/get-user-project.action";

export default async function Projects() {
  const session = await auth();

  const id = session?.user.id ?? "";

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["repositories"],
      queryFn: () => getUserRepositories(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["projects"],
      queryFn: () => getUserProjectsAction(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPage />
    </HydrationBoundary>
  );
}
