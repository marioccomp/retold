"use client";

import { FiActivity, FiGitCommit, FiCalendar, FiTrendingUp, FiCode } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/src/i18n/client";
import { UserStatsDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { useQuery } from "@tanstack/react-query";
import { getGithubDatabaseStats } from "../../../_actions/get-github-database-stats.action";

type Props = {
  stats: UserStatsDTO;
};

export default function ProfileStats({ stats }: Props) {
  const { dict, lang } = useTranslation();
  const lastCommit = stats.lastCommit;

  const formatRelative = (iso: string) => {
    const dt = new Date(iso);
    const diff = Date.now() - dt.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    const rel = dict.profile.relative_time;

    if (minutes < 1) return rel.just_now;
    if (minutes < 60) return `${minutes}${rel.m}`;
    if (hours < 24) return `${hours}${rel.h}`;
    return `${days}${rel.d}`;
  };

  const formatDate = (iso: string) => {
    const dt = new Date(iso);
    const localeString = lang === "pt" ? "pt-BR" : "en-US";
    return new Intl.DateTimeFormat(localeString, { dateStyle: "medium" }).format(dt);
  };

  // Calculate total lines changed as impact
  const impact = stats.linesAdded + stats.linesDeleted;
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
      num
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <FiActivity className="text-[#05dc7f]" />
        <h3 className="text-lg font-bold text-foreground">{dict.profile.stats_section}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Commits */}
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
            <FiGitCommit className="text-[#05dc7f] w-5 h-5 mb-1" />
            <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">
              {formatNumber(stats.commits)}
            </span>
            <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">
              {dict.profile.stat_commits}
            </span>
          </CardContent>
        </Card>

        {/* Lines Code (Impact) */}
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
            <FiCode className="text-[#05dc7f] w-5 h-5 mb-1" />
            <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">
              {formatNumber(impact)}
            </span>
            <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">
              {dict.profile.stat_lines_changed}
            </span>
          </CardContent>
        </Card>

        {/* Active Days */}
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
            <FiCalendar className="text-[#05dc7f] w-5 h-5 mb-1" />
            <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">
              {formatNumber(stats.activeDays)}
            </span>
            <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">
              {dict.profile.stat_active_days}
            </span>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
            <FiTrendingUp className="text-[#05dc7f] w-5 h-5 mb-1" />
            <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">
              {formatNumber(stats.projectsCount)}
            </span>
            <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">
              {dict.profile.stat_projects}
            </span>
          </CardContent>
        </Card>
      </div>
      {/* Last Commit */}
      <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0">
              <FiGitCommit className="text-[#05dc7f] w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">
                  {dict.profile.stat_last_commit_label}
                </span>

                {lastCommit?.repo ? (
                  <a href={`https://github.com/${lastCommit.repo}`} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-0.5 rounded-full bg-[#05dc7f]/10 text-[#05dc7f] border border-[#05dc7f]/20">
                    {lastCommit.repo}
                  </a>
                ) : null}
              </div>

              <p className="text-sm font-semibold text-[#152e2b] dark:text-gray-100 mt-1">
                {lastCommit?.message ? lastCommit.message : dict.profile.stat_no_commits}
              </p>

              {lastCommit?.date ? (
                <p className="text-xs text-[#6b7c7a] dark:text-gray-400 mt-1">
                  {formatDate(lastCommit.date)} • {formatRelative(lastCommit.date)}
                </p>
              ) : null}
            </div>
          </div>

          {/* Small right-side indicator */}
          {lastCommit?.date ? (
            <div className="shrink-0 text-right">
              <div className="text-xs text-[#6b7c7a] dark:text-gray-400">{dict.profile.stat_updated_label}</div>
              <div className="text-sm font-bold text-[#152e2b] dark:text-gray-100">
                {formatRelative(lastCommit.date)}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
