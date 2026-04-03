import { notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { auth } from "@/src/domains/auth/auth";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getProfile } from "../_actions/get-profile";
import { getGithubDatabaseStats } from "../_actions/get-github-database-stats.action";
import { prisma } from "@repo/database";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  
  // 1. FAST CHECK: Verifica existência do usuário antes do prefetch pesado
  // Isso reduz o "Time to First Byte" drasticamente.
  const userExists = await prisma.user.findUnique({
    where: { username },
    select: { id: true }
  });

  if (!userExists) notFound();

  const session = await auth();
  const queryClient = new QueryClient();

  // 2. Prefetch assíncrono - O Next.js começará a fazer o stream do loading.tsx
  // enquanto as queries abaixo são resolvidas no servidor.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["profile", username, page, "", "newest"],
      queryFn: () => getProfile(username, page, "", "newest"),
    }),
    queryClient.prefetchQuery({
      queryKey: ["github-stats", username],
      queryFn: () => getGithubDatabaseStats(username),
    }),
  ]);

  const ownProfile: boolean = session?.user.username === username;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileClient ownProfile={ownProfile} username={username} />
    </HydrationBoundary>
  );
}

