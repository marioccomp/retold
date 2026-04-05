import { auth } from "@/src/domains/auth/auth";
import { redirect } from "next/navigation";
import ChooseUsernameForm from "./ChooseUsernameForm";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.username) {
    if (session.user.hasCompletedOnboarding === false) {
      redirect("/onboarding");
    }

    redirect("/");
  }

  return <ChooseUsernameForm userName={session.user.name ?? ""} />;
}
