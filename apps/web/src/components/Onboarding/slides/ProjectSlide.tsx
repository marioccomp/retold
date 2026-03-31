"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { useEffect, useRef, useState } from "react";
import { Cpu, FileCode2, Box, CheckCircle2, Sparkles, Layout, ArrowDown, Eye } from "lucide-react";

function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span ref={ref} className="onboarding-count">{count}</span>;
}

const StatCardCompact = ({
  icon: Icon,
  label,
  value,
  sublabel,
  color = "green",
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  sublabel: string;
  color?: "green" | "blue" | "orange" | "gray" | "purple";
}) => {
  const colors = {
    green: "text-primary bg-primary/10",
    blue: "text-blue-500 bg-blue-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    gray: "text-muted-foreground bg-muted",
    purple: "text-purple-500 bg-purple-500/10",
  };
  const c = colors[color as keyof typeof colors];

  return (
    <div className="bg-background p-2.5 rounded-xl border border-border/40 shadow-sm flex items-center gap-2.5 min-w-0">
      <div className={`p-2 rounded-lg ${c} shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-black text-foreground leading-none mb-0.5 truncate">
          {value}
        </div>
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide truncate">
          {label}
        </div>
        <div className="text-[8px] text-muted-foreground/70 font-medium truncate">
          {sublabel}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sublabel,
  color = "green",
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  sublabel: string;
  color?: "green" | "blue" | "orange" | "gray" | "purple";
}) => {
  const colors = {
    green: "text-primary bg-secondary",
    blue: "text-blue-500 bg-blue-50",
    orange: "text-orange-500 bg-orange-50",
    gray: "text-muted-foreground bg-muted",
    purple: "text-purple-500 bg-purple-50",
  };
  const c = colors[color as keyof typeof colors];

  return (
    <div className="bg-background p-3 md:p-4 rounded-xl border border-border/50 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow min-w-0">
      <div className={`p-2.5 rounded-lg ${c} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl md:text-2xl font-black text-foreground leading-none mb-1 truncate">
          {value}
        </div>
        <div className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wide truncate">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-1 font-medium truncate">
          {sublabel}
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({
  title,
  icon: Icon,
  color = "green",
}: {
  title: string;
  icon?: any;
  color?: "green" | "blue" | "orange" | "purple";
}) => {
  const colorClass = {
    green: "text-primary",
    blue: "text-blue-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
  }[color];

  return (
    <div className="flex items-center gap-2.5">
      {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{title}</h3>
    </div>
  );
};

const Separator = () => <div className="h-px w-full bg-border/50" />;

const CalloutArrow = ({
  label,
  direction = "left",
  className = "",
}: {
  label: string;
  direction?: "left" | "right";
  className?: string;
}) => {
  return (
    <div
      className={`absolute flex items-center gap-1 z-20 animate-[fadeSlideIn_0.6s_ease-out_both] ${className}`}
      style={{ animationDelay: "0.8s" }}
    >
      {direction === "left" && (
        <>
          <span className="text-[9px] font-bold text-primary/80 whitespace-nowrap bg-primary/5 backdrop-blur-sm px-2 py-0.5 rounded-full border border-primary/15">
            {label}
          </span>
          <svg width="24" height="16" viewBox="0 0 24 16" className="text-primary/50 shrink-0">
            <path d="M0 8 C8 8, 12 2, 24 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
            <path d="M20 0 L24 2 L20 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </>
      )}
      {direction === "right" && (
        <>
          <svg width="24" height="16" viewBox="0 0 24 16" className="text-primary/50 shrink-0 rotate-180">
            <path d="M0 8 C8 8, 12 2, 24 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
            <path d="M20 0 L24 2 L20 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-[9px] font-bold text-primary/80 whitespace-nowrap bg-primary/5 backdrop-blur-sm px-2 py-0.5 rounded-full border border-primary/15">
            {label}
          </span>
        </>
      )}
    </div>
  );
};

export default function ProjectSlide() {
  const { dict } = useTranslation();

  return (
    <OnboardingSlide>
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulseGlow {
          0%, 100% { background-color: oklch(var(--primary) / 0.04); border-color: oklch(var(--primary) / 0.1); }
          50% { background-color: oklch(var(--primary) / 0.12); border-color: oklch(var(--primary) / 0.3); }
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-16 items-center">
        <div className="flex flex-col gap-2 sm:gap-5 text-center lg:text-left order-1 px-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit mx-auto lg:mx-0">
            <Cpu size={14} />
            {dict.onboarding.project.badge}
          </div>

          <h2 className="text-[1.1rem] sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            {dict.onboarding.project.title}
          </h2>
          <p className="text-[13px] sm:text-lg text-muted-foreground leading-snug max-w-lg mx-auto lg:mx-0 mb-2 sm:mb-0">
            {dict.onboarding.project.subtitle}
          </p>

          <div className="hidden sm:flex flex-wrap gap-2 pt-1 justify-center lg:justify-start">
            {[dict.project.overlay.sections.tech_stack, dict.project.overlay.sections.architecture, dict.project.overlay.sections.suggestions, dict.project.overlay.sections.summary].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold text-muted-foreground border border-border/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="relative order-2 w-full max-w-[800px] mx-auto pointer-events-none select-none">
          <div className="hidden lg:flex bg-background rounded-l-xl lg:rounded-xl border border-border shadow-2xl h-[820px] overflow-hidden flex-col relative">
            <div className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-4 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <span className="text-[11px] font-bold text-foreground border-b-2 border-primary pb-1">{dict.onboarding.project.mock_tabs.analysis}</span>
                <span className="text-[11px] font-medium text-muted-foreground pb-1">{dict.onboarding.project.mock_tabs.comments}</span>
                <span className="text-[11px] font-medium text-muted-foreground pb-1">{dict.onboarding.project.mock_tabs.commits}</span>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <StatCard icon={Cpu} label={dict.onboarding.project.mock_stats.languages} value={<CountUp target={3} duration={1200} />} sublabel={dict.onboarding.project.mock_stats.sub_languages} color="blue" />
                <StatCard icon={FileCode2} label={dict.onboarding.project.mock_stats.files} value={<CountUp target={14} duration={1400} />} sublabel={dict.onboarding.project.mock_stats.sub_files} color="orange" />
                <StatCard icon={Box} label={dict.onboarding.project.mock_stats.dependencies} value={<CountUp target={4} duration={1600} />} sublabel={dict.onboarding.project.mock_stats.sub_dependencies} color="purple" />
                <StatCard icon={CheckCircle2} label={dict.onboarding.project.mock_stats.health} value="98%" sublabel={dict.onboarding.project.mock_stats.production} color="green" />
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-foreground tracking-tight">{dict.onboarding.project.mock_content.what_it_does}</h3>
                <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap text-justify">
                  {dict.onboarding.project.mock_content.what_it_does_text}
                </p>
              </div>

              <Separator />

              <div>
                <SectionHeader title={dict.onboarding.project.mock_content.strengths} icon={Sparkles} color="green" />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-secondary">
                    <div className="font-bold text-sm text-foreground mb-1 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {dict.onboarding.project.mock_content.strength_1_title}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dict.onboarding.project.mock_content.strength_1_text}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 border border-secondary">
                    <div className="font-bold text-sm text-foreground mb-1 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {dict.onboarding.project.mock_content.strength_2_title}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dict.onboarding.project.mock_content.strength_2_text}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <SectionHeader title={dict.onboarding.project.mock_content.architecture} icon={Layout} color="purple" />
                <div className="mt-4 p-5 bg-muted rounded-2xl border border-border/60">
                  <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {dict.onboarding.project.mock_content.architecture_text}
                  </p>
                </div>
              </div>

              <div className="h-12" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
          </div>

          <div className="lg:hidden relative w-full max-w-[400px] md:max-w-[850px] mx-auto scale-[0.85] sm:scale-100 origin-top">
            <div className="bg-background rounded-2xl border border-border/60 shadow-xl overflow-hidden relative">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-card/50">
                <span className="text-[9px] font-bold text-foreground border-b-[1.5px] border-primary pb-0.5">{dict.onboarding.project.mock_tabs.analysis}</span>
                <span className="text-[9px] font-medium text-muted-foreground/60 pb-0.5">{dict.onboarding.project.mock_tabs.comments}</span>
                <span className="text-[9px] font-medium text-muted-foreground/60 pb-0.5">{dict.onboarding.project.mock_tabs.commits}</span>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="relative">
                  <div className="grid grid-cols-2 gap-2">
                    <StatCardCompact icon={Cpu} label={dict.onboarding.project.mock_stats.languages} value={<CountUp target={3} duration={1200} />} sublabel={dict.onboarding.project.mock_stats.sub_languages} color="blue" />
                    <StatCardCompact icon={FileCode2} label={dict.onboarding.project.mock_stats.files} value={<CountUp target={14} duration={1400} />} sublabel={dict.onboarding.project.mock_stats.sub_files} color="orange" />
                    <StatCardCompact icon={Box} label={dict.onboarding.project.mock_stats.dependencies} value={<CountUp target={4} duration={1600} />} sublabel={dict.onboarding.project.mock_stats.sub_dependencies} color="purple" />
                    <StatCardCompact icon={CheckCircle2} label={dict.onboarding.project.mock_stats.health} value="98%" sublabel={dict.onboarding.project.mock_stats.production} color="green" />
                  </div>

                  <CalloutArrow
                    label={dict.project.overlay.sections.tech_stack}
                    direction="right"
                    className="-left-2 top-3 -translate-x-full hidden min-[420px]:flex"
                  />
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent" />

                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Eye className="w-3 h-3 text-primary" />
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">
                      {dict.onboarding.project.mock_content.what_it_does}
                    </h4>
                  </div>
                  <div className="relative overflow-hidden rounded-lg">
                    <p className="text-[9.5px] text-foreground/75 leading-tight line-clamp-2">
                      {dict.onboarding.project.mock_content.what_it_does_text}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent" />
                  </div>

                  <CalloutArrow
                    label={dict.project.overlay.sections.summary}
                    direction="left"
                    className="-right-2 top-0.5 translate-x-full hidden min-[420px]:flex"
                  />
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent" />

                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">
                      {dict.onboarding.project.mock_content.strengths}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-primary/[0.04] border border-primary/10" style={{ animation: "pulseGlow 3s ease-in-out infinite" }}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span className="text-[8.5px] font-bold text-foreground truncate">
                          {dict.onboarding.project.mock_content.strength_1_title}
                        </span>
                      </div>
                      <p className="text-[7.5px] text-muted-foreground leading-snug line-clamp-2">
                        {dict.onboarding.project.mock_content.strength_1_text}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/[0.04] border border-primary/10" style={{ animation: "pulseGlow 3s ease-in-out infinite 1.5s" }}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span className="text-[8.5px] font-bold text-foreground truncate">
                          {dict.onboarding.project.mock_content.strength_2_title}
                        </span>
                      </div>
                      <p className="text-[7.5px] text-muted-foreground leading-snug line-clamp-2">
                        {dict.onboarding.project.mock_content.strength_2_text}
                      </p>
                    </div>
                  </div>

                  <CalloutArrow
                    label={dict.project.overlay.sections.strengths}
                    direction="right"
                    className="-left-2 top-0.5 -translate-x-full hidden min-[420px]:flex"
                  />
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent" />

                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layout className="w-3 h-3 text-purple-500" />
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider">
                      {dict.onboarding.project.mock_content.architecture}
                    </h4>
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-muted/50 border border-border/30 p-2">
                    <p className="text-[8.5px] text-foreground/70 leading-snug line-clamp-2">
                      {dict.onboarding.project.mock_content.architecture_text}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-muted/50 to-transparent" />
                  </div>

                  <CalloutArrow
                    label={dict.project.overlay.sections.architecture}
                    direction="left"
                    className="-right-2 top-0.5 translate-x-full hidden min-[420px]:flex"
                  />
                </div>
              </div>

              <div className="h-6 bg-gradient-to-t from-background via-background/80 to-transparent flex items-end justify-center pb-0.5">
                <ArrowDown className="w-2.5 h-2.5 text-muted-foreground/40 animate-bounce" />
              </div>
            </div>
          </div>

          <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle_at_50%_50%,oklch(0.79_0.17_150_/_0.10),transparent_60%)] -z-10" />
        </div>
      </div>
    </OnboardingSlide>
  );
}
