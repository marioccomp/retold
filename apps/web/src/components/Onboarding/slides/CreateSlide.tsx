"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { FiPlus, FiGithub, FiCheck, FiUpload, FiX } from "react-icons/fi";
import imgEscalonador from "@/assets/mockup-escalonador.jpg";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CreateSlide — mirrors the real CreateProjectPanel.tsx layout
 * Shows: title, description, visibility, images area, repo selection
 * with exact classes and border radii from the real component.
 */
export default function CreateSlide() {
  const { dict } = useTranslation();
  const t = dict.project.create_panel;

  return (
    <OnboardingSlide>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-16 items-center">
        {/* Left — Text */}
        <div className="flex flex-col gap-2 sm:gap-5 text-center lg:text-left order-1 px-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit mx-auto lg:mx-0">
            <FiPlus size={14} />
            {dict.onboarding.create.badge}
          </div>

          <h2 className="text-[1.1rem] sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            {dict.onboarding.create.title}
          </h2>
          <p className="text-[13px] sm:text-lg text-muted-foreground leading-snug max-w-lg mx-auto lg:mx-0 mb-2 sm:mb-0">
            {dict.onboarding.create.subtitle}
          </p>

          <ul className="hidden sm:flex flex-col gap-4 pt-2">
            {[
              dict.onboarding.create.step_1,
              dict.onboarding.create.step_2,
              dict.onboarding.create.step_3,
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — CreateProjectPanel replica (Desktop) or Simplified (Mobile) */}
        <div className="relative order-2 w-full max-w-[800px] mx-auto pointer-events-none select-none">
          
          {/* Desktop Replica */}
          <div className="hidden lg:block bg-background rounded-[16px] border border-border shadow-2xl overflow-hidden custom-scrollbar">
            {/* Header */}
            <div className="px-7 py-5 border-b border-border bg-gradient-to-br from-muted/50 to-background">
              <h2 className="m-0 text-[1.4rem] font-semibold text-foreground">{t.title}</h2>
              <p className="m-[6px_0_0] text-[0.9rem] text-muted-foreground">{t.subtitle}</p>
            </div>

            <div className="p-7 grid grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label className="text-[0.875rem] font-medium text-foreground">
                    {t.labels.title}
                  </Label>
                  <Input
                    readOnly
                    value={dict.onboarding.create.mock_title_input}
                    className="h-auto p-[12px_14px] rounded-[10px] border-border text-foreground text-[0.95rem] bg-background"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[0.875rem] font-medium text-foreground">
                    {t.labels.description}
                  </Label>
                  <Textarea
                    readOnly
                    value={dict.onboarding.create.mock_description}
                    className="min-h-[100px] resize-none p-[12px_14px] rounded-[10px] border-border text-foreground text-[0.95rem] bg-background"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[0.875rem] font-medium text-foreground">
                    {t.labels.visibility}
                  </Label>
                  <Select defaultValue="public">
                    <SelectTrigger className="h-auto p-[12px_14px] rounded-[10px] border-border text-foreground text-[0.95rem] bg-background font-medium">
                      {dict.project.create_panel.visibility_options.public}
                    </SelectTrigger>
                  </Select>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="m-0 text-[0.95rem] font-semibold text-foreground">{t.labels.images}</h3>
                    <span className="text-[0.8rem] text-muted-foreground">1/3</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20">
                      <Image src={imgEscalonador} alt="Project mock" className="absolute inset-0 w-full h-full object-cover block" />
                    </div>
                    <div className="relative aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center text-muted-foreground">
                      <FiUpload className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-medium uppercase">{dict.project.create_panel.add}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="m-0 text-[0.95rem] font-semibold text-foreground">{t.labels.repository}</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-[14px_16px] border rounded-[10px] border-primary bg-primary/5">
                      <span className="text-[0.9rem] text-foreground font-medium flex items-center gap-2">
                        <FiGithub size={16} /> {dict.onboarding.create.mock_repo}
                      </span>
                      <FiCheck className="text-primary" size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-6 flex gap-3 justify-end border-t border-border bg-muted/30">
              <Button variant="outline" className="border-border rounded-[10px] h-11 px-6">{t.cancel}</Button>
              <Button className="bg-primary text-primary-foreground rounded-[10px] h-11 px-8 font-bold">{t.submit}</Button>
            </div>
          </div>

          {/* Mobile View — Simplified Form */}
          <div className="lg:hidden flex flex-col gap-6 w-full max-w-[400px] mx-auto pb-32 pt-0 scale-[0.75] origin-top mb-[-120px]">
            <div className="bg-background border border-border rounded-xl shadow-xl overflow-hidden">
               <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <h2 className="text-xs font-bold text-foreground">{t.title}</h2>
               </div>
               <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <div className="w-16 h-1.5 bg-muted rounded-full" />
                    <div className="w-full h-8 bg-muted/5 border border-border rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <div className="w-20 h-1.5 bg-muted rounded-full" />
                    <div className="w-full h-16 bg-muted/5 border border-border rounded-lg" />
                  </div>
                  <div className="pt-1">
                    <div className="w-full h-8 bg-primary rounded-lg flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                      {dict.project.create_panel.submit}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle_at_70%_50%,oklch(0.79_0.17_150_/_0.15),transparent_60%)] blur-xl -z-10" />
        </div>
      </div>
    </OnboardingSlide>
  );
}
