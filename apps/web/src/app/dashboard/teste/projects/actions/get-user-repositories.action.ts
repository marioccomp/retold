"use server";

import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";

export async function getRepositoriesAction() {
  // ISSO AQUI DEVE SER JOGADO PARA UMA ACTION DE PROJECTS QUANDO SAIR DESSA PASTA TESTE
  const session = await auth();
  if (!session?.user?.id) return [];

  return getUserRepositories();
}
