import { NextResponse } from "next/server";
import { auth } from "@/src/domains/auth/auth";
import { saveGithubInstallation } from "./save-installation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (!installationId || !["install", "update"].includes(setupAction ?? "")) {
    return popupCloseResponse("ERROR");
  }

  const session = await auth();

  if (!session?.user?.id) {
    return popupCloseResponse("NOT_AUTHENTICATED");
  }

  console.log(`[route.ts] Iniciando salvamento da instalacao GitHub ${installationId} para user ${session.user.id}...`);
  await saveGithubInstallation({
    installationId,
    userId: Number(session.user.id),
  });
  console.log(`[route.ts] Salvamento concluido com sucesso!`);

  // 🔥 sempre avisa que repos mudaram
  return popupCloseResponse("REPOSITORIES_UPDATED");
}
function popupCloseResponse(status: string) {
  return new NextResponse(
    `
<!DOCTYPE html>
<html>
  <head>
    <title>GitHub App</title>
  </head>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage(
          { type: "GITHUB_APP_${status}" },
          window.location.origin
        );
      }
      window.close();
    </script>
    <p>Finalizando instalação...</p>
  </body>
</html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
