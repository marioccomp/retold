"use client";

import { FiStar } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";
import ProjectCard from "@/src/components/ProjectCard";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { useTranslation } from "@/src/i18n/client";

type Props = {
    project?: ProjectCardDTO;
};

export default function ProfilePinnedProject({ project }: Props) {
    const { dict } = useTranslation();

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <FiStar className="text-[#05dc7f] fill-[#05dc7f]/20" />
                <h3 className="text-lg font-bold text-foreground">{dict.profile.pinned_projects_section}</h3>
            </div>
            {project ? (
                <div className="max-w-md">
                    <ProjectCard project={project} disableHover />
                </div>
            ) : (
                <Card className="border-dashed border-2 bg-muted/20 border-border/50">
                    <CardContent className="py-10 text-center text-muted-foreground italic">
                        {dict.profile.pinned_projects_empty}
                    </CardContent>
                </Card>
            )}
        </section>
    );
}
