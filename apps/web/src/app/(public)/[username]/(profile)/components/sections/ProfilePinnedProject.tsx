import { useState } from "react";
import { FiStar, FiPlus } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";
import ProjectCard from "@/src/components/ProjectCard";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { useTranslation } from "@/src/i18n/client";
import { Button } from "@/components/ui/button";
import SelectPinnedProjectModal from "../modals/SelectPinnedProjectModal";
import { toggleProjectPin } from "@/src/app/(public)/[username]/actions/pin-project";
import { toast } from "sonner";

type Props = {
    allProjects: ProjectCardDTO[];
    ownProfile: boolean;
};

export default function ProfilePinnedProject({ allProjects, ownProfile }: Props) {
    const { dict } = useTranslation();
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

    const pinnedProjects = allProjects.filter(p => p.isPinned);
    const unpinnedProjects = allProjects.filter(p => !p.isPinned);

    const handleUnpin = async (projectId: number) => {
        try {
            await toggleProjectPin(projectId);
            toast.success(dict.profile.success);
        } catch (error) {
            toast.error(dict.profile.unexpected_error);
        }
    };

    if (!pinnedProjects.length && !ownProfile) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <FiStar className="text-[#05dc7f] fill-[#05dc7f]/20" />
                    <h3 className="text-lg font-bold text-foreground">{dict.profile.pinned_projects_section}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedProjects.map((project) => (
                    <div key={project.id} className="relative group">
                        <ProjectCard project={project} disableHover />
                        {ownProfile && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleUnpin(project.id);
                                }}
                            >
                                {dict.profile.unpin_project}
                            </Button>
                        )}
                    </div>
                ))}

                {ownProfile && pinnedProjects.length < 3 && (
                    <Card
                        className="bg-muted/10 border-dashed border-2 border-border/50 hover:bg-muted/20 hover:border-[#05dc7f]/50 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[300px]"
                        onClick={() => setIsSelectModalOpen(true)}
                    >
                        <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground group-hover:text-[#05dc7f]">
                            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center group-hover:bg-[#05dc7f]/10 transition-colors">
                                <FiPlus className="w-6 h-6" />
                            </div>
                            <span className="font-medium">{dict.profile.add_pinned_project}</span>
                        </CardContent>
                    </Card>
                )}
            </div>

            {!pinnedProjects.length && !ownProfile && (
                <Card className="border-dashed border-2 bg-muted/20 border-border/50">
                    <CardContent className="py-10 text-center text-muted-foreground italic">
                        {dict.profile.pinned_projects_empty}
                    </CardContent>
                </Card>
            )}

            <SelectPinnedProjectModal
                isOpen={isSelectModalOpen}
                onClose={() => setIsSelectModalOpen(false)}
                unpinnedProjects={unpinnedProjects}
            />
        </section>
    );
}
