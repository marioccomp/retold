"use client";

import { useState, useEffect } from "react";
import { FiX, FiPlus, FiBriefcase, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { PublicProfileDTO, EducationDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/src/i18n/client";
import { updateProfileDetails } from "../../../_actions/edit-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { INSTITUTIONS, getCourses } from "@/src/lib/education-options";
import { useParams } from "next/navigation";

const currentYear = new Date().getFullYear();
const pastYears = Array.from({ length: 60 }, (_, i) => currentYear - i);
const futureYears = Array.from({ length: 15 }, (_, i) => (currentYear + 14) - i);
const monthsPt = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const monthsEn = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
};

export default function EditEducationModal({ isOpen, onClose, profile }: Props) {
  const { dict, lang } = useTranslation();
  const courses = getCourses(lang);

  const queryClient = useQueryClient();
  const [educations, setEducations] = useState<(Partial<EducationDTO> & { isCurrent?: boolean })[]>(
    profile.educations?.length > 0
      ? profile.educations.map((edu) => ({
          ...edu,
          isCurrent: !edu.endDate || new Date(edu.endDate) > new Date(),
        }))
      : [
          {
            degree: "",
            institution: "",
            startDate: new Date().toISOString(),
            endDate: null,
            isCurrent: true,
          },
        ]
  );

  useEffect(() => {
    if (isOpen) {
      setEducations(
        profile.educations?.length > 0
          ? profile.educations.map((edu) => ({
              ...edu,
              isCurrent: !edu.endDate || new Date(edu.endDate) > new Date(),
            }))
          : [
              {
                degree: "",
                institution: "",
                startDate: new Date().toISOString(),
                endDate: null,
                isCurrent: true,
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
    const currentEdu = { ...newEdus[index] };

    if (field === "isCurrent") {
      currentEdu.isCurrent = value;
      if (value) {
        // Se mudou para "Atualmente", e a data de término era passada ou nula, 
        // definimos para uma data futura (ex: daqui a 1 ano) para manter a lógica de "previsão"
        const now = new Date();
        if (!currentEdu.endDate || new Date(currentEdu.endDate) <= now) {
          const futureDate = new Date();
          futureDate.setFullYear(now.getFullYear() + 1);
          currentEdu.endDate = futureDate.toISOString();
        }
      } else {
        // Se desmarcou "Atualmente", e a data de término era futura ou nula,
        // definimos para a data atual
        const now = new Date();
        if (!currentEdu.endDate || new Date(currentEdu.endDate) > now) {
          currentEdu.endDate = now.toISOString();
        }
      }
    } else {
      (currentEdu as any)[field] = value;
    }

    newEdus[index] = currentEdu;
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
        isCurrent: true,
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
          isCurrent: true,
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
      <div className="bg-background w-full sm:max-w-[650px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-semibold text-foreground">
            {dict.profile.education_section}
          </h2>
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
              className="text-primary hover:text-primary/90 hover:bg-primary/5 text-xs font-bold gap-1 cursor-pointer"
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
                    <div className="flex gap-2">
                      <Select
                        value={edu.startDate ? new Date(edu.startDate).getMonth().toString() : ""}
                        onValueChange={(val) => {
                          const date = edu.startDate ? new Date(edu.startDate) : new Date();
                          date.setMonth(parseInt(val));
                          handleUpdateEducation(idx, "startDate", date.toISOString());
                        }}
                      >
                        <SelectTrigger className="flex-1 h-10 rounded-[10px] border-border focus:ring-primary/30 cursor-pointer">
                          <SelectValue placeholder={dict.profile.edit_section_modal.month} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover" position="popper">
                          {(lang === "pt" ? monthsPt : monthsEn).map((m, i) => (
                            <SelectItem key={i} value={i.toString()} className="cursor-pointer">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={
                          edu.startDate ? new Date(edu.startDate).getFullYear().toString() : ""
                        }
                        onValueChange={(val) => {
                          const date = edu.startDate ? new Date(edu.startDate) : new Date();
                          date.setFullYear(parseInt(val));
                          handleUpdateEducation(idx, "startDate", date.toISOString());
                        }}
                      >
                        <SelectTrigger className="w-[100px] h-10 rounded-[10px] border-border focus:ring-primary/30 cursor-pointer">
                          <SelectValue placeholder={dict.profile.edit_section_modal.year} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover" position="popper">
                          {pastYears.map((y) => (
                            <SelectItem key={y} value={y.toString()} className="cursor-pointer">
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      {edu.isCurrent
                        ? dict.profile.edit_section_modal.expected_end_label
                        : dict.profile.edit_section_modal.end_label}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={edu.endDate ? new Date(edu.endDate).getMonth().toString() : ""}
                          onValueChange={(val) => {
                            const date = edu.endDate ? new Date(edu.endDate) : new Date();
                            date.setMonth(parseInt(val));
                            handleUpdateEducation(idx, "endDate", date.toISOString());
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "flex-1 h-10 rounded-[10px] border-border focus:ring-primary/30 cursor-pointer"
                            )}
                          >
                            <SelectValue placeholder={dict.profile.edit_section_modal.month} />
                          </SelectTrigger>
                          <SelectContent className="bg-popover" position="popper">
                            {(lang === "pt" ? monthsPt : monthsEn).map((m, i) => (
                              <SelectItem key={i} value={i.toString()} className="cursor-pointer">
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
 
                        <Select
                          value={edu.endDate ? new Date(edu.endDate).getFullYear().toString() : ""}
                          onValueChange={(val) => {
                            const date = edu.endDate ? new Date(edu.endDate) : new Date();
                            date.setFullYear(parseInt(val));
                            handleUpdateEducation(idx, "endDate", date.toISOString());
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-[100px] h-10 rounded-[10px] border-border focus:ring-primary/30 cursor-pointer"
                            )}
                          >
                            <SelectValue placeholder={dict.profile.edit_section_modal.year} />
                          </SelectTrigger>
                          <SelectContent className="bg-popover" position="popper">
                            {(edu.isCurrent ? futureYears : pastYears).map((y) => (
                              <SelectItem key={y} value={y.toString()} className="cursor-pointer">
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
 
                      <div className="flex items-center gap-2 px-1">
                        <Checkbox
                          id={`current-${idx}`}
                          checked={edu.isCurrent}
                          onCheckedChange={(checked) => handleUpdateEducation(idx, "isCurrent", checked)}
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
            disabled={mutation.isPending || !hasChanges || hasInvalidDates}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
