"use client";

import { FiActivity, FiGitCommit, FiCalendar, FiTrendingUp, FiCode } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/src/i18n/client";
import { UserStatsDTO } from "@/src/domains/user/dtos/public-profile.dto";

type Props = {
    stats: UserStatsDTO;
};

export default function ProfileStats({ stats }: Props) {
    const { dict } = useTranslation();

    // Calculate total lines changed as impact
    const impact = stats.linesAdded + stats.linesDeleted;
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
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
                        <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">{formatNumber(stats.commits)}</span>
                        <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">{dict.profile.stat_commits}</span>
                    </CardContent>
                </Card>

                {/* Lines Code (Impact) */}
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiCode className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">{formatNumber(impact)}</span>
                        <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">{dict.profile.stat_lines_changed}</span>
                    </CardContent>
                </Card>

                {/* Active Days */}
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiCalendar className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">{formatNumber(stats.activeDays)}</span>
                        <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">{dict.profile.stat_active_days}</span>
                    </CardContent>
                </Card>

                {/* Projects */}
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiTrendingUp className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b] dark:text-gray-100">{formatNumber(stats.projectsCount)}</span>
                        <span className="text-xs text-[#6b7c7a] dark:text-gray-400 uppercase tracking-wider font-medium">{dict.profile.stat_projects}</span>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
