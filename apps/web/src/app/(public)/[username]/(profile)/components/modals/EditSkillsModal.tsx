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
    mutationFn: (data: { skills: string[] }) => updateProfileDetails(data, profile.id),
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
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
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
    mutation.mutate({ skills });
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-semibold text-[#152e2b]">{dict.profile.skills_section}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                placeholder={dict.profile.edit_section_modal.skills_placeholder}
                className="focus-visible:ring-[#05dc7f] flex-1 h-10 font-medium"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddSkill}
                className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] h-10 px-4 cursor-pointer"
              >
                <FiPlus size={18} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 p-4 border border-dashed border-border/60 rounded-xl min-h-[100px] bg-muted/5">
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <Badge
                    key={skill}
                    className="bg-[#05dc7f]/10 text-[#047857] border-[#05dc7f]/30 hover:bg-[#05dc7f]/20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all group font-bold"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-[#047857]/50 hover:text-destructive transition-colors cursor-pointer"
                    >
                      <FiX size={14} />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic m-auto">
                  {dict.profile.edit_section_modal.skills_none}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border/60 flex justify-end gap-3 bg-[#fafafa]">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-[#152e2b] font-bold cursor-pointer"
          >
            {dict.profile.edit_modal.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={mutation.isPending || !hasChanges}
            className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] px-8 font-bold transition-all shadow-lg shadow-[#05dc7f]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
