"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { MdFavorite } from "react-icons/md";
import { FiMessageCircle, FiBell, FiUsers, FiArrowRight } from "react-icons/fi";

export default function FinalSlide() {
  const { dict } = useTranslation();

  return (
    <OnboardingSlide>
      <div className="flex flex-col items-center text-center gap-8 max-w-2xl mx-auto">
        {/* Interaction icons cluster */}
        <div className="relative w-32 h-32">
          {/* Heart */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <div className="w-14 h-14 rounded-full bg-[#ff4d4d]/10 flex items-center justify-center">
              <MdFavorite className="text-[#ff4d4d] onboarding-heart" size={28} />
            </div>
          </div>
          {/* Comment */}
          <div className="absolute bottom-2 left-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center onboarding-bubble" style={{ animationDelay: "0.3s" }}>
              <FiMessageCircle className="text-primary" size={22} />
            </div>
          </div>
          {/* Bell */}
          <div className="absolute bottom-2 right-2">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center onboarding-bubble" style={{ animationDelay: "0.6s" }}>
              <FiBell className="text-blue-500" size={22} />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            {dict.onboarding.final.title}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {dict.onboarding.final.subtitle}
          </p>
        </div>

        {/* Features row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
          {[
            { icon: MdFavorite, text: dict.onboarding.final.feature_like, color: "text-[#ff4d4d]", bg: "bg-[#ff4d4d]/10" },
            { icon: FiMessageCircle, text: dict.onboarding.final.feature_comment, color: "text-primary", bg: "bg-primary/10" },
            { icon: FiUsers, text: dict.onboarding.final.feature_follow, color: "text-blue-500", bg: "bg-blue-500/10" },
          ].map(({ icon: Icon, text, color, bg }, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/30 border border-border/10"
            >
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={color} size={20} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
          <FiArrowRight className="text-primary" />
          <span>{dict.onboarding.final.cta_hint}</span>
        </div>

        {/* Decorative orbs */}
        <div className="absolute -top-20 left-[20%] w-[250px] h-[250px] rounded-full bg-[#ff4d4d]/5 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-[15%] w-[300px] h-[300px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      </div>
    </OnboardingSlide>
  );
}
