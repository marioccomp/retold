"use client";

import { useState, useEffect } from "react";
import { FiX, FiPlus, FiBriefcase, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { PublicProfileDTO, EducationDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/src/i18n/client";
import { updateProfileDetails } from "../../../_actions/edit-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { INSTITUTIONS, getCourses } from "@/src/lib/education-options";
import { useParams } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
};

export default function EditEducationModal({ isOpen, onClose, profile }: Props) {
  const { dict, lang } = useTranslation();
  const courses = getCourses(lang);
  const dateLocale = lang === "pt" ? ptBR : enUS;

  const queryClient = useQueryClient();
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
    mutationFn: (data: { educations: any[] }) => updateProfileDetails(data, profile.id),
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
    if (educations.length === 1) {
      setEducations([
        {
          degree: "",
          institution: "",
          startDate: new Date().toISOString(),
          endDate: null,
        },
      ]);
    } else {
      setEducations(educations.filter((_, i) => i !== index));
    }
  };

  const hasChanges =
    JSON.stringify(
      educations.map((edu) => ({
        degree: edu.degree || "",
        institution: edu.institution || "",
        startDate: edu.startDate || "",
        endDate: edu.endDate || null,
      }))
    ) !==
    JSON.stringify(
      profile.educations?.map((edu) => ({
        degree: edu.degree || "",
        institution: edu.institution || "",
        startDate: edu.startDate || "",
        endDate: edu.endDate || null,
      })) || [
        {
          degree: "",
          institution: "",
          startDate: educations[0]?.startDate || "",
          endDate: null,
        },
      ]
    );

  const hasInvalidDates = educations.some(
    (edu) => edu.startDate && edu.endDate && new Date(edu.startDate) > new Date(edu.endDate)
  );

  const handleSave = () => {
    if (!hasChanges || hasInvalidDates) {
      onClose();
      return;
    }

    const cleanedEducations = educations.filter(
      (edu) => edu.degree?.trim() || edu.institution?.trim()
    );

    mutation.mutate({
      educations: cleanedEducations.map((edu) => ({
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className="bg-white w-full max-w-[650px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-semibold text-[#152e2b]">{dict.profile.education_section}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
          <div className="flex items-center justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddEducation}
              className="text-[#05dc7f] hover:text-[#03c56f] hover:bg-[#05dc7f]/5 text-xs font-bold gap-1 cursor-pointer"
            >
              <FiPlus size={14} /> {dict.profile.edit_section_modal.add_button}
            </Button>
          </div>

          <div className="space-y-4">
            {educations.map((edu, idx) => (
              <div
                key={idx}
                className="p-4 border border-border/60 rounded-xl bg-muted/5 space-y-4 relative group"
              >
                <button
                  onClick={() => handleRemoveEducation(idx)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <FiTrash2 size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      {dict.profile.edit_section_modal.course_label}
                    </Label>
                    <ComboboxInput
                      options={courses}
                      value={edu.degree || ""}
                      onChange={(val: string) => handleUpdateEducation(idx, "degree", val)}
                      placeholder={dict.profile.edit_section_modal.course_placeholder}
                      emptyMessage={dict.profile.edit_section_modal.course_hint}
                      createLabel={dict.profile.edit_section_modal.use_value}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      {dict.profile.edit_section_modal.institution_label}
                    </Label>
                    <ComboboxInput
                      options={INSTITUTIONS}
                      value={edu.institution || ""}
                      onChange={(val: string) => handleUpdateEducation(idx, "institution", val)}
                      placeholder={dict.profile.edit_section_modal.institution_placeholder}
                      emptyMessage={dict.profile.edit_section_modal.institution_hint}
                      createLabel={dict.profile.edit_section_modal.use_value}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      {dict.profile.edit_section_modal.start_label}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-9 font-medium px-3",
                            !edu.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {edu.startDate ? (
                            format(new Date(edu.startDate), "PPP", { locale: dateLocale })
                          ) : (
                            <span>{dict.profile.edit_section_modal.select_date}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={edu.startDate ? new Date(edu.startDate) : undefined}
                          onSelect={(date) =>
                            handleUpdateEducation(
                              idx,
                              "startDate",
                              date ? date.toISOString() : undefined
                            )
                          }
                          initialFocus
                          locale={dateLocale}
                          captionLayout="dropdown"
                          fromYear={1970}
                          toYear={new Date().getFullYear() + 5}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      {dict.profile.edit_section_modal.end_label}
                    </Label>
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            disabled={!edu.endDate}
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 font-medium px-3",
                              !edu.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {edu.endDate ? (
                              format(new Date(edu.endDate), "PPP", { locale: dateLocale })
                            ) : (
                              <span>{dict.profile.edit_section_modal.select_date}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={edu.endDate ? new Date(edu.endDate) : undefined}
                            onSelect={(date) =>
                              handleUpdateEducation(
                                idx,
                                "endDate",
                                date ? date.toISOString() : undefined
                              )
                            }
                            disabled={(date) =>
                              edu.startDate ? date < new Date(edu.startDate) : false
                            }
                            initialFocus
                            locale={dateLocale}
                            captionLayout="dropdown"
                            fromYear={1970}
                            toYear={new Date().getFullYear() + 5}
                          />
                        </PopoverContent>
                      </Popover>
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
                          className="text-[11px] text-muted-foreground cursor-pointer font-bold uppercase"
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
            disabled={mutation.isPending || !hasChanges || hasInvalidDates}
            className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] px-8 font-bold transition-all shadow-lg shadow-[#05dc7f]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
