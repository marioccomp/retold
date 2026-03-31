import OnboardingFlow from "@/src/components/Onboarding/OnboardingFlow";
import { auth } from "@/src/domains/auth/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retold — Onboarding",
  description:
    "Discover how Retold helps developers showcase their portfolio, analyze projects with AI, and build their professional story.",
};

export default async function OnboardingPage() {
  const session = await auth();

  return <OnboardingFlow isLoggedIn={!!session?.user} />;
}
