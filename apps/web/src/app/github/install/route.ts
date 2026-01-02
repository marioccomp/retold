import { NextResponse } from "next/server";
import { auth } from "@/src/domains/auth/auth";
import { saveGithubInstallation } from "./save-installation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (!installationId || setupAction !== "install") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  await saveGithubInstallation({
    installationId,
    userId: Number(session.user.id),
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
