"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { FiUser, FiGithub, FiLinkedin, FiGlobe, FiEdit2, FiBookOpen } from "react-icons/fi";
import { Quote, Activity, GitCommit, Code, Calendar, TrendingUp } from "lucide-react";
import Image from "next/image";
import ownerPic from "@/assets/mario.jpeg";

export default function ProfileSlide() {
  const { dict } = useTranslation();

  return (
    <OnboardingSlide>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-16 items-center">
        {/* Left — Text */}
        <div className="flex flex-col gap-2 sm:gap-5 text-center lg:text-left order-1 px-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit mx-auto lg:mx-0">
            <FiUser size={14} />
            {dict.onboarding.profile.badge}
          </div>

          <h2 className="text-[1.1rem] sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            {dict.onboarding.profile.title}
          </h2>
          <p className="text-[13px] sm:text-lg text-muted-foreground leading-snug max-w-lg mx-auto lg:mx-0 mb-2 sm:mb-0">
            {dict.onboarding.profile.subtitle}
          </p>
        </div>

        {/* Right — Real Profile Replica (Desktop) or Header (Mobile) */}
        <div className="relative order-2 w-full max-w-[850px] mx-auto pointer-events-none select-none">
          {/* Desktop Replica */}
          <div className="hidden lg:block bg-background rounded-2xl border border-border shadow-2xl overflow-hidden custom-scrollbar max-h-[90vh] overflow-y-auto">
            {/* Banner */}
            <div className="h-[110px] w-full relative bg-gradient-to-r from-orange-400/80 via-rose-400/80 to-purple-500/80" />

            <div className="grid grid-cols-[170px_1fr] gap-5 px-5 pb-6">
              {/* Sidebar */}
              <div className="flex flex-col items-center pt-2">
                <div className="-mt-12 relative z-10">
                  <div className="w-[90px] h-[90px] rounded-full border-[4px] border-background shadow-sm overflow-hidden bg-card">
                    <Image
                      src={ownerPic}
                      alt="Mario Junior"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <h1 className="mt-2 text-[1.2rem] font-bold text-foreground text-center">
                  Mario Jr
                </h1>

                {/* Job Info */}
                <div className="w-full mt-3 rounded-2xl border border-border bg-background p-3 flex flex-col items-center shadow-sm">
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                    {dict.profile.edit_modal.job_label}
                  </span>
                  <h2 className="text-[11px] font-bold text-foreground text-center">
                    {dict.onboarding.profile.mock_role}
                  </h2>
                </div>

                {/* Bio Info */}
                <div className="mt-3 w-full relative p-3 rounded-2xl border border-border bg-background shadow-sm">
                  <Quote className="absolute -top-2 -left-1 text-primary/10 w-6 h-6 -rotate-12 fill-primary/5" />
                  <p className="relative z-10 text-[10px] text-foreground font-medium text-center italic leading-relaxed">
                    {dict.onboarding.profile.mock_bio}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-1.5 w-full mt-3">
                  <div className="col-span-1 border border-border bg-card/40 rounded-xl p-2 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-foreground">27</span>
                    <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-wide mt-0.5">
                      {dict.profile.views}
                    </span>
                  </div>
                  <div className="col-span-1 border border-border bg-card/40 rounded-xl p-2 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-foreground">10</span>
                    <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-wide mt-0.5">
                      {dict.profile.likes}
                    </span>
                  </div>
                  <div className="col-span-1 border border-border bg-card/40 rounded-xl p-2 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-foreground">4</span>
                    <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-wide mt-0.5">
                      {dict.profile.followers}
                    </span>
                  </div>
                  <div className="col-span-1 border border-border bg-card/40 rounded-xl p-2 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-foreground">6</span>
                    <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-wide mt-0.5">
                      {dict.profile.following}
                    </span>
                  </div>
                </div>

                {/* Social Actions */}
                <div className="flex bg-card/40 border border-border rounded-xl px-2 py-2.5 mt-3 justify-between w-full items-center">
                  <div className="flex-1 flex items-center justify-center">
                    <FiGithub size={13} className="text-foreground" />
                  </div>
                  <div className="w-[1px] h-4 bg-border" />
                  <div className="flex-1 flex items-center justify-center">
                    <FiLinkedin size={13} className="text-foreground" />
                  </div>
                  <div className="w-[1px] h-4 bg-border" />
                  <div className="flex-1 flex items-center justify-center">
                    <FiGlobe size={13} className="text-foreground" />
                  </div>
                </div>

                {/* Edit Button */}
                <div className="w-full mt-3 bg-primary text-primary-foreground font-bold text-[11px] py-2.5 rounded-xl flex justify-center shadow-sm">
                  {dict.profile.edit_profile}
                </div>
              </div>

              {/* Main Content */}
              <div className="pt-4 min-w-0">
                {/* Tabs */}
                <div className="flex items-center gap-5 border-b border-border/60">
                  <span className="text-[11px] font-bold text-foreground relative pb-2.5 px-1 after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-primary after:rounded-t-full">
                    {dict.profile.tabs.profile}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground pb-2.5 px-1">
                    {dict.profile.tabs.projects}
                  </span>
                </div>

                {/* Sobre Card */}
                <div className="mt-5 rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-card/30">
                    <div className="flex items-center gap-1.5">
                      <FiBookOpen className="text-primary w-3.5 h-3.5" />
                      <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                        {dict.profile.about_section}
                      </h3>
                    </div>
                    <FiEdit2 className="text-muted-foreground w-3 h-3" />
                  </div>
                  <div className="p-4 text-[10px] leading-relaxed text-muted-foreground text-justify">
                    Estudante de Ciência da Computação na UFRRJ. Desenvolvedor Fullstack com
                    experiência prática em React, Next.js, Node e bancos de dados. Focado em
                    arquiteturas escaláveis e produtos reais.
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="mt-5">
                  <div className="flex items-center gap-1.5 mb-3 px-1">
                    <Activity className="text-primary w-3.5 h-3.5" />
                    <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                      {dict.profile.stats_section}
                    </h3>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {/* Commits */}
                    <div className="rounded-xl border border-border bg-card/40 p-2.5 flex flex-col items-center justify-center shadow-sm">
                      <GitCommit className="text-primary w-3.5 h-3.5 mb-1.5" />
                      <span className="text-[12px] font-black text-foreground">77</span>
                      <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5 text-center">
                        {dict.profile.stat_commits}
                      </span>
                    </div>
                    {/* Linhas */}
                    <div className="rounded-xl border border-border bg-card/40 p-2.5 flex flex-col items-center justify-center shadow-sm">
                      <Code className="text-primary w-3.5 h-3.5 mb-1.5" />
                      <span className="text-[12px] font-black text-foreground">29K</span>
                      <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5 text-center leading-[1.2]">
                        {dict.profile.stat_lines_changed}
                      </span>
                    </div>
                    {/* Dias */}
                    <div className="rounded-xl border border-border bg-card/40 p-2.5 flex flex-col items-center justify-center shadow-sm">
                      <Calendar className="text-primary w-3.5 h-3.5 mb-1.5" />
                      <span className="text-[12px] font-black text-foreground">35</span>
                      <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5 text-center leading-[1.2]">
                        {dict.profile.stat_active_days}
                      </span>
                    </div>
                    {/* Projetos */}
                    <div className="rounded-xl border border-border bg-card/40 p-2.5 flex flex-col items-center justify-center shadow-sm text-center">
                      <TrendingUp className="text-primary w-3.5 h-3.5 mb-1.5" />
                      <span className="text-[12px] font-black text-foreground">4</span>
                      <span className="text-[6.5px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5 text-center leading-[1.2]">
                        {dict.profile.stat_projects}
                      </span>
                    </div>
                  </div>

                  {/* Último Commit Card */}
                  <div className="mt-2.5 rounded-xl border border-border bg-card/40 p-3 shadow-sm flex flex-col gap-2">
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GitCommit className="text-primary w-3 h-3 shrink-0" />
                        <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 hidden md:inline-block">
                          {dict.profile.stat_last_commit_label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold truncate">
                          juita-os-scheduler
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[7px] text-muted-foreground uppercase tracking-widest mb-px">
                          {dict.profile.stat_updated_label}
                        </span>
                        <span className="text-[9px] font-bold text-foreground">66d</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-foreground leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: dict.onboarding.profile.mock_pr }} />
                    <p className="text-[8.5px] font-medium text-muted-foreground">
                      {dict.onboarding.profile.mock_date}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile View — Simplified Header */}
          <div className="lg:hidden flex flex-col items-center bg-background border border-border rounded-xl shadow-xl overflow-hidden max-w-[350px] mx-auto pb-32 pt-0 scale-[0.75] origin-top mb-[-120px]">
            <div className="h-16 w-full bg-secondary" />
            <div className="-mt-8 px-6 flex flex-col items-center w-full text-center pb-6">
              <div className="w-16 h-16 rounded-full border-4 border-background shadow-lg overflow-hidden shrink-0 bg-card">
                <Image src={ownerPic} alt="Mario Junior" className="w-full h-full object-cover" />
              </div>
              <h1 className="mt-2 text-base font-black text-foreground">Mario Junior</h1>
              <p className="text-[10px] text-muted-foreground">@mariojr</p>
              <div className="mt-3 px-3 py-1.5 bg-primary/10 rounded-lg">
                <span className="text-[10px] font-bold text-primary">{dict.onboarding.profile.mock_role}</span>
              </div>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle_at_30%_40%,oklch(0.79_0.17_150_/_0.10),transparent_60%)] blur-xl -z-10" />
        </div>
      </div>
    </OnboardingSlide>
  );
}
