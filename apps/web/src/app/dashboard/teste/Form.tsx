"use client";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { upgradeGithubPermissions } from "./action-test";

export default function Teste() {
  const { data: session } = useSession();

  const handleUpgradePermissions = (scope: string) => {
    upgradeGithubPermissions(scope);
  };

  console.log(session);
  return (
    <div className="w-full h-full flex items-center justify-center mt-50">
      <Card className="max-w-100 flex items-center">
        <CardTitle>Aqui é o card pras permissoes do github</CardTitle>
        <Button
          className="max-w-[80%] whitespace-normal p-10 cursor-pointer"
          onClick={() => handleUpgradePermissions("read:user user:email repo")}
        >
          Ao clicar aqui, voce permite que a gente acesse todos seus repositorios (publico e
          privado)
        </Button>
        <Button
          className="max-w-[80%] whitespace-normal p-10 cursor-pointer"
          onClick={() => handleUpgradePermissions("read:user user:email public_repo")}
        >
          Ao clicar aqui, voce permite que a gente acesse todos seus repositorios publicos
        </Button>
      </Card>
    </div>
  );
}
