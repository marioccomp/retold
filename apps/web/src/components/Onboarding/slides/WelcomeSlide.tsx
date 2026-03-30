"use client";

import { useTranslation } from "@/src/i18n/client";
import { useTheme } from "next-themes";
import OnboardingSlide from "../OnboardingSlide";
import Image from "next/image";
import { FiCheckCircle } from "react-icons/fi";
import logo from "@/assets/logo-full.svg";
import logoDark from "@/assets/logo-full-dark.svg";

export default function WelcomeSlide() {
  const { dict } = useTranslation();
  const { resolvedTheme } = useTheme();

  const logoSrc = resolvedTheme === "dark" ? logoDark : logo;

  return (
    <OnboardingSlide>
      <div className="flex flex-col items-center text-center gap-8">
        {/* Logo */}
        <div className="onboarding-float">
          <Image
            src={logoSrc}
            alt="Retold"
            width={220}
            height={42}
            priority
            className="select-none"
          />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-4 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
            {dict.onboarding.welcome.title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {dict.onboarding.welcome.subtitle}
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FiCheckCircle className="text-primary" size={18} />
            <span>{dict.onboarding.welcome.badge_portfolio}</span>
          </div>
          <span className="hidden sm:inline text-muted-foreground/30">•</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FiCheckCircle className="text-primary" size={18} />
            <span>{dict.onboarding.welcome.badge_feedback}</span>
          </div>
          <span className="hidden sm:inline text-muted-foreground/30">•</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FiCheckCircle className="text-primary" size={18} />
            <span>{dict.onboarding.welcome.badge_ai}</span>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="absolute -top-20 right-[10%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-[5%] w-[250px] h-[250px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      </div>
    </OnboardingSlide>
  );
}
