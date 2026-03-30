"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { useEffect, useRef, useState } from "react";
import { Cpu, FileCode2, Box, CheckCircle2, Sparkles, Layout, Code2 } from "lucide-react";

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

export default function ProjectSlide() {
  const { dict } = useTranslation();

  return (
    <OnboardingSlide>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-16 items-center">
        {/* Left — Text */}
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

        {/* Right — Real AI Analysis View */}
        <div className="relative order-2 w-full max-w-[800px] mx-auto pointer-events-none select-none">
          
          {/* Desktop Replica */}
          <div className="hidden lg:flex bg-background rounded-l-xl lg:rounded-xl border border-border shadow-2xl h-[820px] overflow-hidden flex-col relative">
            {/* Modal Header style */}
            <div className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-4 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <span className="text-[11px] font-bold text-foreground border-b-2 border-primary pb-1">{dict.onboarding.project.mock_tabs.analysis}</span>
                <span className="text-[11px] font-medium text-muted-foreground pb-1">{dict.onboarding.project.mock_tabs.comments}</span>
                <span className="text-[11px] font-medium text-muted-foreground pb-1">{dict.onboarding.project.mock_tabs.commits}</span>
              </div>
            </div>

            {/* Scrollable Content inside */}
            <div className="p-8 space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <StatCard icon={Cpu} label={dict.onboarding.project.mock_stats.languages} value={<CountUp target={3} duration={1200} />} sublabel={dict.onboarding.project.mock_stats.sub_languages} color="blue" />
                <StatCard icon={FileCode2} label={dict.onboarding.project.mock_stats.files} value={<CountUp target={14} duration={1400} />} sublabel={dict.onboarding.project.mock_stats.sub_files} color="orange" />
                <StatCard icon={Box} label={dict.onboarding.project.mock_stats.dependencies} value={<CountUp target={4} duration={1600} />} sublabel={dict.onboarding.project.mock_stats.sub_dependencies} color="purple" />
                <StatCard icon={CheckCircle2} label={dict.onboarding.project.mock_stats.health} value="98%" sublabel={dict.onboarding.project.mock_stats.production} color="green" />
              </div>

              {/* Summary */}
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-foreground tracking-tight">{dict.onboarding.project.mock_content.what_it_does}</h3>
                <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap text-justify">
                  {dict.onboarding.project.mock_content.what_it_does_text}
                </p>
              </div>

              <Separator />

              {/* Strengths */}
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

              {/* Architecture Section */}
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

            {/* Bottom gradient mask to fake scroll */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
          </div>

          {/* Mobile View — Simplified Grid */}
          <div className="lg:hidden grid grid-cols-2 gap-3 w-full max-w-[450px] mx-auto pb-32 pt-0 scale-[0.75] origin-top mb-[-120px]">
            <StatCard icon={Cpu} label={dict.onboarding.project.mock_stats.languages} value={<CountUp target={3} duration={1200} />} sublabel={dict.onboarding.project.mock_stats.sub_languages} color="blue" />
            <StatCard icon={FileCode2} label={dict.onboarding.project.mock_stats.files} value={<CountUp target={14} duration={1400} />} sublabel={dict.onboarding.project.mock_stats.sub_files} color="orange" />
            <StatCard icon={Box} label={dict.onboarding.project.mock_stats.dependencies} value={<CountUp target={4} duration={1600} />} sublabel={dict.onboarding.project.mock_stats.sub_dependencies} color="purple" />
            <StatCard icon={CheckCircle2} label={dict.onboarding.project.mock_stats.health} value="98%" sublabel={dict.onboarding.project.mock_stats.production} color="green" />
          </div>

          {/* Glow */}
          <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle_at_50%_50%,oklch(0.79_0.17_150_/_0.10),transparent_60%)] blur-xl -z-10" />
        </div>
      </div>
    </OnboardingSlide>
  );
}
