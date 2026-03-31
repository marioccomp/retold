"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { MdFavorite } from "react-icons/md";
import { FiMessageCircle, FiBell, FiUsers, FiArrowRight } from "react-icons/fi";

export default function FinalSlide() {
  const { dict } = useTranslation();

  return (
    <OnboardingSlide>
      <div className="flex flex-col items-center text-center gap-4 sm:gap-8 max-w-2xl mx-auto px-4">
        {/* Interaction icons cluster */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mt-2 sm:mt-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(var(--primary)/0.3)_0%,transparent_70%)] rounded-full animate-pulse" />
          <div className="relative w-full h-full rounded-full bg-secondary/50 border border-border/20 flex items-center justify-center">
            <FiMessageCircle className="text-primary" size={32} />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#ff4d4d]/10 border border-[#ff4d4d]/20 flex items-center justify-center animate-bounce">
            <MdFavorite className="text-[#ff4d4d]" size={16} />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1 sm:gap-3 -mt-2">
          <h2 className="text-[1.5rem] sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {dict.onboarding.final.title}
          </h2>
          <p className="text-[13px] sm:text-base text-muted-foreground leading-snug max-w-md mx-auto">
            {dict.onboarding.final.subtitle}
          </p>
        </div>

        {/* Mock Comment Section (Real UI Style) */}
        <div className="w-full max-w-md bg-background/50 border border-border/40 rounded-2xl p-4 sm:p-5 text-left scale-[0.85] sm:scale-100 -my-4 sm:my-2 shadow-2xl shadow-primary/5">
          <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-3">
             <FiMessageCircle className="text-primary w-4 h-4" />
             <span className="text-xs font-bold text-foreground">2 {dict.project.comments.title}</span>
          </div>

          <div className="space-y-4">
             {/* Main Comment */}
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">J</div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{dict.onboarding.final.mock_comment_user}</span>
                      <span className="text-[10px] text-muted-foreground">• {dict.onboarding.final.mock_comment_time}</span>
                   </div>
                   <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{dict.onboarding.final.mock_comment_text}</p>
                   
                   <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold text-muted-foreground hover:text-primary cursor-pointer flex items-center gap-1">
                        <FiArrowRight className="w-2.5 h-2.5" /> {dict.project.comments.reply}
                      </span>
                   </div>

                   {/* Reply */}
                   <div className="ml-4 mt-3 border-l-2 border-muted pl-3 space-y-3">
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">M</div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-foreground">{dict.onboarding.final.mock_reply_user}</span>
                              <span className="text-[9px] text-muted-foreground">• {dict.onboarding.final.mock_reply_time}</span>
                           </div>
                           <p className="text-[11px] text-foreground/80 mt-0.5">{dict.onboarding.final.mock_reply_text}</p>
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Features row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-lg pt-2">
          {[
            { icon: MdFavorite, text: dict.onboarding.final.feature_like, color: "text-[#ff4d4d]", bg: "bg-[#ff4d4d]/10" },
            { icon: FiMessageCircle, text: dict.onboarding.final.feature_comment, color: "text-primary", bg: "bg-primary/10" },
            { icon: FiUsers, text: dict.onboarding.final.feature_follow, color: "text-blue-500", bg: "bg-blue-500/10" },
          ].map(({ icon: Icon, text, color, bg }, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl bg-secondary/30 border border-border/10"
            >
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={color} size={14} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA info */}
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground pt-4">
          <FiArrowRight className="text-primary w-3 h-3" />
          <span>{dict.onboarding.final.cta_hint}</span>
        </div>

        {/* Decorative orbs */}
        <div className="absolute -top-10 left-[20%] w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,77,77,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 right-[15%] w-[180px] sm:w-[250px] h-[180px] sm:h-[250px] rounded-full bg-[radial-gradient(circle_at_center,oklch(var(--primary)/0.12)_0%,transparent_70%)] pointer-events-none" />
      </div>
    </OnboardingSlide>
  );
}
