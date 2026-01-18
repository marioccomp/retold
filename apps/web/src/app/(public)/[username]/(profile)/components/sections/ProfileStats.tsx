"use client";

import { FiActivity, FiGitCommit, FiGitPullRequest, FiAlertCircle } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/src/i18n/client";

type Props = {
    stats: {
        commits: number;
        prs: number;
        issues: number;
        projectsCount: number;
    };
};

export default function ProfileStats({ stats }: Props) {
    const { dict } = useTranslation();

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <FiActivity className="text-[#05dc7f]" />
                <h3 className="text-lg font-bold text-foreground">{dict.profile.stats_section}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiGitCommit className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b]">{stats.commits}</span>
                        <span className="text-xs text-[#6b7c7a] uppercase tracking-wider font-medium">{dict.profile.stat_commits}</span>
                    </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiGitPullRequest className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b]">{stats.prs}</span>
                        <span className="text-xs text-[#6b7c7a] uppercase tracking-wider font-medium">{dict.profile.stat_prs}</span>
                    </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiAlertCircle className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b]">{stats.issues}</span>
                        <span className="text-xs text-[#6b7c7a] uppercase tracking-wider font-medium">{dict.profile.stat_issues}</span>
                    </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#05dc7f]/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
                        <FiActivity className="text-[#05dc7f] w-5 h-5 mb-1" />
                        <span className="text-2xl font-bold text-[#152e2b]">{stats.projectsCount}</span>
                        <span className="text-xs text-[#6b7c7a] uppercase tracking-wider font-medium">{dict.profile.stat_projects}</span>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
