import { notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { userRepository } from "@repo/database";
import { mapUserToPublicProfile } from "@/src/domains/user/mappers/user-to-public-profile.mapper";
import { auth } from "@/src/domains/auth/auth";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getProfile } from "../_actions/get-profile";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["profile", username],
    queryFn: () => getProfile(username),
  });

  const profile = queryClient.getQueryData(["profile", username]);

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
