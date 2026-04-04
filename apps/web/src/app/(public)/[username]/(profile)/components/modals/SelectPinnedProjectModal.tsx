"use client";

import { useState, useEffect } from "react";
import { FiX, FiSearch, FiPlus, FiStar } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";
import { toast } from "sonner";
import { toggleProjectPin } from "@/src/app/(public)/[username]/actions/pin-project";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import placeholderImage from "@/assets/empty_file.png";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { capitalizeSkill, getProjectCardTags } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  unpinnedProjects: ProjectCardDTO[];
};

export default function SelectPinnedProjectModal({ isOpen, onClose, unpinnedProjects }: Props) {
  const { dict } = useTranslation();
  const params = useParams();
  const username = params?.username as string;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  const filteredProjects = unpinnedProjects.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePin = async (projectId: number) => {
    setLoadingMap((prev) => ({ ...prev, [projectId]: true }));
    try {
      await toggleProjectPin(projectId);
      toast.success(dict.profile.success);
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
      onClose();
    } catch (error: any) {
      const message =
        error.message === "LIMIT_REACHED"
          ? dict.profile.pin_error_limit_reached
          : dict.profile.unexpected_error;
      toast.error(message);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [projectId]: false }));
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
      className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className="bg-background w-full md:max-w-4xl h-[96dvh] md:h-auto md:max-h-[85dvh] rounded-t-[2.5rem] md:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 overflow-hidden relative border-t-2 border-t-primary md:border-t-0">
        {/* Header */}
        <div className="relative px-6 sm:px-8 py-6 sm:py-8 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl">
                  <FiStar className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {dict.profile.add_pinned_project}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium ml-1 sm:ml-12 opacity-80">
                {dict.profile.select_project_to_pin}
              </p>
            </div>
            <button
              onClick={onClose}
              className="group w-10 h-10 flex items-center justify-center rounded-2xl bg-muted/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer"
            >
              <FiX size={20} className="transition-transform duration-300" />
            </button>
          </div>

          {/* Integrated Search */}
          <div className="mt-6 sm:mt-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              placeholder={dict.profile.search_projects_placeholder}
              className="bg-muted/50 border-border/60 pl-11 py-6 sm:py-7 text-sm sm:text-base rounded-2xl focus-visible:ring-primary/20 focus-visible:ring-offset-0 transition-all placeholder:text-muted-foreground/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pb-4">
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className="group relative flex flex-col bg-muted/5 hover:bg-muted/30 border border-border/60 hover:border-primary/40 rounded-[1.8rem] transition-all duration-300 overflow-hidden cursor-pointer animate-in fade-in slide-in-from-bottom-4 shadow-sm"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handlePin(project.id)}
              >
                {/* Compact Preview */}
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={project.images?.[0] || placeholderImage.src}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-95 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {getProjectCardTags(project.tags, project.featuredTagIds, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-wider"
                        >
                          {capitalizeSkill(tag.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Header & Description */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${loadingMap[project.id] ? "bg-primary/20 scale-110" : "bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground"}`}
                    >
                      {loadingMap[project.id] ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiPlus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted/40 rounded-[2.5rem] flex items-center justify-center mb-6">
                <FiSearch size={32} className="text-muted-foreground/30" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                {dict.feed.feedprojectsgrid.no_projects.title}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-[250px] opacity-70">
                {dict.feed.feedprojectsgrid.no_projects.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-8 py-5 bg-muted/20 border-t border-border/60 text-[10px] text-center text-muted-foreground uppercase tracking-[0.25em] font-black">
          {dict.profile.unpin_project === "Desafixar Projeto"
            ? "Selecione para destacar no seu perfil"
            : "SELECT TO HIGHLIGHT ON YOUR PROFILE"}
        </div>
      </div>
    </div>
  );
}
