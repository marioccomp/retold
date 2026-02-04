import { useState, useEffect } from "react";
import { FiX, FiSearch, FiPlus, FiStar } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";
import { toast } from "sonner";
import { toggleProjectPin } from "@/src/app/(public)/[username]/actions/pin-project";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import placeholderImage from "@/assets/empty_file.png";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    unpinnedProjects: ProjectCardDTO[];
};

export default function SelectPinnedProjectModal({ isOpen, onClose, unpinnedProjects }: Props) {
    const { dict } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

    const filteredProjects = unpinnedProjects.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePin = async (projectId: number) => {
        setLoadingMap(prev => ({ ...prev, [projectId]: true }));
        try {
            await toggleProjectPin(projectId);
            toast.success(dict.profile.success);
            onClose();
        } catch (error: any) {
            const message = error.message === "LIMIT_REACHED"
                ? dict.profile.pin_error_limit_reached
                : dict.profile.unexpected_error;
            toast.error(message);
        } finally {
            setLoadingMap(prev => ({ ...prev, [projectId]: false }));
        }
    };

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4"
            onMouseDown={handleOverlayMouseDown}
        >
            <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-white/10">
                {/* Header */}
                <div className="relative px-8 py-8 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#05dc7f]/10 rounded-xl">
                                    <FiStar className="text-[#05dc7f] w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                                    {dict.profile.add_pinned_project}
                                </h2>
                            </div>
                            <p className="text-muted-foreground font-medium ml-11">
                                {dict.profile.select_project_to_pin}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="group w-10 h-10 flex items-center justify-center rounded-2xl bg-muted/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer"
                        >
                            <FiX size={20} className="transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Integrated Search */}
                    <div className="mt-8 relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FiSearch className="h-5 w-5 text-muted-foreground group-focus-within:text-[#05dc7f] transition-colors" />
                        </div>
                        <Input
                            placeholder={dict.profile.search_projects_placeholder}
                            className="bg-muted/30 border-border/40 pl-11 py-7 text-lg rounded-2xl focus-visible:ring-[#05dc7f] focus-visible:ring-offset-0 transition-all placeholder:text-muted-foreground/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                        {filteredProjects.map((project, index) => (
                            <div
                                key={project.id}
                                className="group relative flex flex-col bg-muted/20 hover:bg-muted/40 border border-border/40 hover:border-[#05dc7f]/50 rounded-[1.5rem] transition-all duration-300 overflow-hidden cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => handlePin(project.id)}
                            >
                                {/* Compact Preview */}
                                <div className="relative aspect-[16/9] w-full overflow-hidden">
                                    <img
                                        src={project.images?.[0] || placeholderImage.src}
                                        alt={project.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {project.tags.slice(0, 3).map(tag => (
                                                <span key={tag.id} className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Header & Description */}
                                <div className="p-5 flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-[#05dc7f] transition-colors">
                                            {project.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                            {project.description}
                                        </p>
                                    </div>

                                    <div className="shrink-0 pt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${loadingMap[project.id] ? 'bg-[#05dc7f]/20 scale-110' : 'bg-[#05dc7f]/10 group-hover:bg-[#05dc7f] text-[#05dc7f] group-hover:text-white'}`}>
                                            {loadingMap[project.id] ? (
                                                <div className="w-4 h-4 border-2 border-[#05dc7f] border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <FiPlus size={20} className="group-hover:scale-125 transition-transform" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Loading Overlay */}
                                {loadingMap[project.id] && (
                                    <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-10">
                                        {/* Already handled by the spinner inside the button, but keeping for overlay feel */}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {filteredProjects.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-muted/30 rounded-[2.5rem] flex items-center justify-center mb-6">
                                <FiSearch size={40} className="text-muted-foreground/40" />
                            </div>
                            <h4 className="text-xl font-bold text-foreground mb-2">
                                {dict.feed.feedprojectsgrid.no_projects.title}
                            </h4>
                            <p className="text-muted-foreground max-w-[250px]">
                                {dict.feed.feedprojectsgrid.no_projects.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-8 py-5 bg-muted/10 border-t border-border/40 text-[11px] text-center text-muted-foreground uppercase tracking-[0.2em] font-bold">
                    {dict.profile.unpin_project === "Desafixar Projeto" ? "Selecione para destacar no seu perfil" : "SELECT TO HIGHLIGHT ON YOUR PROFILE"}
                </div>
            </div>
        </div>
    );
}
