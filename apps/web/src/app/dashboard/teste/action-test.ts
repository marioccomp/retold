"use server";
import { signIn } from "@/src/domains/auth/auth";

export async function upgradeGithubPermissions(scope: string) {
  await signIn(
    "github",
    {
      redirectTo: "/dashboard",
    },
    {
      scope: scope,
      prompt: "consent",
    }
  );
}
