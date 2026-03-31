import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retold — Onboarding",
  description:
    "Discover how Retold helps developers showcase their portfolio, analyze projects with AI, and build their professional story.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
