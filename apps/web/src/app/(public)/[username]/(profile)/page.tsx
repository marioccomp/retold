import { notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { auth } from "@/src/domains/auth/auth";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getProfile } from "../_actions/get-profile";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { getGithubDatabaseStats } from "../_actions/get-github-database-stats.action";


type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["profile", username],
      queryFn: () => getProfile(username),
    }),
    queryClient.prefetchQuery({
      queryKey: ["github-stats", username],
      queryFn: () => getGithubDatabaseStats(username),
    }),
  ]);

  const profile: PublicProfileDTO | null | undefined = await queryClient.getQueryData(["profile", username]);


  if (!profile) notFound();



  // const user = await userRepository.findPublicProfileByUsername(username);

  // if (!user) notFound();

  const ownProfile: boolean = session?.user.username === username;

  // const profile = mapUserToPublicProfile(user);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileClient ownProfile={ownProfile} username={username} />{" "}
    </HydrationBoundary>
  );
}
