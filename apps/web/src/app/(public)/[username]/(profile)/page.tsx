import { notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { userRepository } from "@repo/database";
import { mapUserToPublicProfile } from "@/src/domains/user/mappers/user-to-public-profile.mapper";
import { auth } from "@/src/domains/auth/auth";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const user = await userRepository.findPublicProfileByUsername(username);

  if (!user) notFound();

  const ownProfile: boolean = session?.user.username === user.username;

  const profile = mapUserToPublicProfile(user);

  return <ProfileClient profile={profile} ownProfile={ownProfile} />;
}
