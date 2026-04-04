"use client";

import { useState, useEffect } from "react";
import { FiX, FiPlus, FiCode } from "react-icons/fi";
import { toast } from "sonner";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/src/i18n/client";
import { updateProfileDetails } from "../../../_actions/edit-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { capitalizeSkill } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
};

export default function EditSkillsModal({ isOpen, onClose, profile }: Props) {
  const { dict } = useTranslation();
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSkills(profile.skills ?? []);
    }
  }, [isOpen, profile]);

  const mutation = useMutation({
    mutationFn: (data: { skills: string[] }) => updateProfileDetails(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(dict.profile.edit_modal.success);
        queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
        onClose();
      } else {
        toast.error(res.message || dict.profile.edit_modal.error);
      }
    },
    onError: () => {
      toast.error(dict.profile.edit_modal.error);
    },
  });

  const handleAddSkill = () => {
    const cleanedSkill = capitalizeSkill(newSkill);
    if (cleanedSkill && !skills.includes(cleanedSkill)) {
      setSkills([...skills, cleanedSkill]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const hasChanges =
    JSON.stringify([...skills].sort()) !== JSON.stringify([...(profile.skills ?? [])].sort());

  const handleSave = () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    mutation.mutate({ skills: skills.map(capitalizeSkill) });
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className="bg-background w-full md:max-w-[620px] h-[96dvh] md:h-auto md:max-h-[85dvh] rounded-t-[2rem] md:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-semibold text-foreground">{dict.profile.skills_section}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                placeholder={dict.profile.edit_section_modal.skills_placeholder}
                className="flex-1 h-10 font-medium rounded-xl border-border/60"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddSkill}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 cursor-pointer rounded-xl"
              >
                <FiPlus size={18} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2.5 p-5 border border-dashed border-border/60 rounded-2xl min-h-[140px] bg-muted/5 items-start content-start">
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <Badge
                    key={skill}
                    className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all group font-bold shadow-sm"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-primary/50 hover:text-destructive transition-colors cursor-pointer"
                    >
                      <FiX size={14} />
                    </button>
                  </Badge>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center m-auto p-4">
                   <FiCode className="text-muted-foreground/30 mb-1" size={24} />
                   <span className="text-xs text-muted-foreground italic">
                    {dict.profile.edit_section_modal.skills_none}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border/60 flex justify-end gap-3 bg-muted/40">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground font-bold cursor-pointer"
          >
            {dict.profile.edit_modal.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={mutation.isPending || !hasChanges}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
