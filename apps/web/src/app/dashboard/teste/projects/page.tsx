"use server";

import { auth } from "@/src/domains/auth/auth";
import ProjectsPage from "./ProjectsPage";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getUserRepositories } from "@/lib/github";

export default async function Projects() {
  const session = await auth();

  const id = session?.user.id ?? "";

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["repositories"],
    queryFn: () => getUserRepositories(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPage />
    </HydrationBoundary>
  );
}
