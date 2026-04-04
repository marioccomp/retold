"use client";

import { useState, useEffect } from "react";
import { FiX, FiBookOpen, FiBriefcase, FiCode, FiPlus, FiTrash2, FiCalendar } from "react-icons/fi";
import { toast } from "sonner";
import { PublicProfileDTO, EducationDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/src/i18n/client";
import { Checkbox } from "@/components/ui/checkbox";
import { updateProfileDetails } from "../../_actions/edit-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { capitalizeSkill } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
};

export default function EditProfileDetailsModal({ isOpen, onClose, profile }: Props) {
  const { dict } = useTranslation();
  const queryClient = useQueryClient();

  // Bio
  const [longBio, setLongBio] = useState(profile.longBio ?? "");

  // Skills state
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [newSkill, setNewSkill] = useState("");

  // Education state
  const [educations, setEducations] = useState<Partial<EducationDTO>[]>(
    profile.educations?.length > 0
      ? profile.educations
      : [
          {
            degree: "",
            institution: "",
            startDate: new Date().toISOString(),
            endDate: null,
          },
        ]
  );

  useEffect(() => {
    if (isOpen) {
      setLongBio(profile.longBio ?? "");
      setSkills(profile.skills ?? []);
      setEducations(
        profile.educations?.length > 0
          ? profile.educations
          : [
              {
                degree: "",
                institution: "",
                startDate: new Date().toISOString(),
                endDate: null,
              },
            ]
      );
    }
  }, [isOpen, profile]);

  const mutation = useMutation({
    mutationFn: (data: any) => updateProfileDetails(data),
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

  const handleUpdateEducation = (
    index: number,
    field: keyof EducationDTO | "isCurrent",
    value: any
  ) => {
    const newEdus = [...educations];
    if (field === "isCurrent") {
      newEdus[index].endDate = value ? null : new Date().toISOString();
    } else {
      newEdus[index] = { ...newEdus[index], [field]: value };
    }
    setEducations(newEdus);
  };

  const handleAddEducation = () => {
    setEducations([
      ...educations,
      {
        degree: "",
        institution: "",
        startDate: new Date().toISOString(),
        endDate: null,
      },
    ]);
  };

  const handleRemoveEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    mutation.mutate({
      longBio,
      skills: skills.map(capitalizeSkill),
      educations: educations.map((edu) => ({
        degree: edu.degree || "",
        institution: edu.institution || "",
        startDate: edu.startDate || new Date().toISOString(),
        endDate: edu.endDate || null,
      })),
    });
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
      <div className="bg-background w-full md:max-w-[650px] h-[96dvh] md:h-auto md:max-h-[85dvh] rounded-t-[2rem] md:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {dict.profile.edit_section_modal.title}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar flex-1">
          {/* Detailed About */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
              <FiBookOpen className="text-primary/70" size={14} />
              {dict.profile.edit_section_modal.long_bio_label}
            </Label>
            <Textarea
              value={longBio}
              onChange={(e) => setLongBio(e.target.value)}
              className="min-h-[160px] resize-none border-border/60 rounded-xl focus-visible:ring-primary/20 font-medium bg-background"
              placeholder={dict.profile.edit_section_modal.long_bio_placeholder}
            />
          </div>

          {/* Education Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                <FiBriefcase className="text-primary/70" size={14} />
                {dict.profile.edit_section_modal.education_label}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddEducation}
                className="text-primary hover:text-primary hover:bg-primary/5 text-xs font-bold gap-1 cursor-pointer"
              >
                <FiPlus size={14} /> {dict.profile.edit_section_modal.add_button}
              </Button>
            </div>

            <div className="space-y-4">
              {educations.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-5 border border-border/60 rounded-2xl bg-muted/5 space-y-4 relative group"
                >
                  {educations.length > 1 && (
                    <button
                      onClick={() => handleRemoveEducation(idx)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider opacity-70">
                        {dict.profile.edit_section_modal.course_label}
                      </Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => handleUpdateEducation(idx, "degree", e.target.value)}
                        placeholder={dict.profile.edit_section_modal.course_placeholder}
                        className="h-10 bg-background border-border/60 rounded-xl focus-visible:ring-primary/20 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider opacity-70">
                        {dict.profile.edit_section_modal.institution_label}
                      </Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => handleUpdateEducation(idx, "institution", e.target.value)}
                        placeholder={dict.profile.edit_section_modal.institution_placeholder}
                        className="h-10 bg-background border-border/60 rounded-xl focus-visible:ring-primary/20 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider opacity-70">
                        {dict.profile.edit_section_modal.start_label}
                      </Label>
                      <Input
                        type="month"
                        value={edu.startDate?.substring(0, 7) || ""}
                        onChange={(e) =>
                          handleUpdateEducation(
                            idx,
                            "startDate",
                            new Date(e.target.value).toISOString()
                          )
                        }
                        className="h-10 bg-background border-border/60 rounded-xl focus-visible:ring-primary/20 font-medium cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider opacity-70">
                        {dict.profile.edit_section_modal.end_label}
                      </Label>
                      <div className="space-y-2">
                        <Input
                          type="month"
                          disabled={!edu.endDate}
                          value={edu.endDate?.substring(0, 7) || ""}
                          onChange={(e) =>
                            handleUpdateEducation(
                              idx,
                              "endDate",
                              new Date(e.target.value).toISOString()
                            )
                          }
                          className="h-10 bg-background border-border/60 rounded-xl focus-visible:ring-primary/20 font-medium cursor-pointer disabled:opacity-30"
                        />
                        <div className="flex items-center gap-2 px-1">
                          <Checkbox
                            id={`current-${idx}`}
                            checked={!edu.endDate}
                            onCheckedChange={(checked) =>
                              handleUpdateEducation(idx, "isCurrent", !!checked)
                            }
                            className="cursor-pointer"
                          />
                          <label
                            htmlFor={`current-${idx}`}
                            className="text-[10px] text-muted-foreground cursor-pointer font-black uppercase tracking-wider"
                          >
                            {dict.profile.edit_section_modal.currently_label}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Manager */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
              <FiCode className="text-primary/70" size={14} />
              {dict.profile.edit_section_modal.skills_label}
            </Label>

            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                placeholder={dict.profile.edit_section_modal.skills_placeholder}
                className="h-11 bg-background border-border/60 rounded-xl focus-visible:ring-primary/20 flex-1 font-medium"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddSkill}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 cursor-pointer rounded-xl"
              >
                <FiPlus size={18} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2.5 p-5 border border-dashed border-border/60 rounded-2xl min-h-[100px] bg-muted/5 items-start content-start">
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <Badge
                    key={skill}
                    className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 flex items-center gap-2 px-4 py-2 rounded-xl transition-all group font-bold shadow-sm"
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
                <div className="m-auto flex flex-col items-center gap-2 py-4">
                  <FiCode className="text-muted-foreground/30" size={24} />
                   <span className="text-xs text-muted-foreground italic">
                    {dict.profile.edit_section_modal.skills_none}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border/60 flex justify-end gap-3 bg-muted/40 backdrop-blur-md">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground font-bold cursor-pointer"
          >
            {dict.profile.edit_modal.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/95 px-8 font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
