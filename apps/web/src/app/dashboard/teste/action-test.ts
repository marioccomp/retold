"use server";
import { signIn } from "@/src/domains/auth/auth"; // Importe do seu arquivo de configuração

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
