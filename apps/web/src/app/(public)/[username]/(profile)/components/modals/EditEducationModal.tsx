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

type Props = {
    isOpen: boolean;
    onClose: () => void;
    profile: PublicProfileDTO;
};

export default function EditEducationModal({ isOpen, onClose, profile }: Props) {
    const { dict } = useTranslation();
    const queryClient = useQueryClient();
    const [educations, setEducations] = useState<Partial<EducationDTO>[]>(
        profile.educations?.length > 0 ? profile.educations : [{
            degree: "",
            institution: "",
            startDate: new Date().toISOString(),
            endDate: null
        }]
    );

    useEffect(() => {
        if (isOpen) {
            setEducations(profile.educations?.length > 0 ? profile.educations : [{
                degree: "",
                institution: "",
                startDate: new Date().toISOString(),
                endDate: null
            }]);
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
        }
    });

    const handleUpdateEducation = (index: number, field: keyof EducationDTO | 'isCurrent', value: any) => {
        const newEdus = [...educations];
        if (field === 'isCurrent') {
            newEdus[index].endDate = value ? null : new Date().toISOString();
        } else {
            newEdus[index] = { ...newEdus[index], [field]: value };
        }
        setEducations(newEdus);
    };

    const handleAddEducation = () => {
        setEducations([...educations, {
            degree: "",
            institution: "",
            startDate: new Date().toISOString(),
            endDate: null
        }]);
    };

    const handleRemoveEducation = (index: number) => {
        setEducations(educations.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        mutation.mutate({
            educations: educations.map(edu => ({
                degree: edu.degree || "",
                institution: edu.institution || "",
                startDate: edu.startDate || new Date().toISOString(),
                endDate: edu.endDate || null
            }))
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
                            <div key={idx} className="p-4 border border-border/60 rounded-xl bg-muted/5 space-y-4 relative group">
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
                                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{dict.profile.edit_section_modal.course_label}</Label>
                                        <Input
                                            value={edu.degree}
                                            onChange={(e) => handleUpdateEducation(idx, 'degree', e.target.value)}
                                            placeholder={dict.profile.edit_section_modal.course_placeholder}
                                            className="focus-visible:ring-[#05dc7f] h-9 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{dict.profile.edit_section_modal.institution_label}</Label>
                                        <Input
                                            value={edu.institution}
                                            onChange={(e) => handleUpdateEducation(idx, 'institution', e.target.value)}
                                            placeholder={dict.profile.edit_section_modal.institution_placeholder}
                                            className="focus-visible:ring-[#05dc7f] h-9 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{dict.profile.edit_section_modal.start_label}</Label>
                                        <Input
                                            type="month"
                                            value={edu.startDate?.substring(0, 7) || ""}
                                            onChange={(e) => handleUpdateEducation(idx, 'startDate', new Date(e.target.value).toISOString())}
                                            className="focus-visible:ring-[#05dc7f] h-9 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{dict.profile.edit_section_modal.end_label}</Label>
                                        <div className="space-y-2">
                                            <Input
                                                type="month"
                                                disabled={!edu.endDate}
                                                value={edu.endDate?.substring(0, 7) || ""}
                                                onChange={(e) => handleUpdateEducation(idx, 'endDate', new Date(e.target.value).toISOString())}
                                                className="focus-visible:ring-[#05dc7f] h-9 font-medium"
                                            />
                                            <div className="flex items-center gap-2 px-1">
                                                <Checkbox
                                                    id={`current-${idx}`}
                                                    checked={!edu.endDate}
                                                    onCheckedChange={(checked) => handleUpdateEducation(idx, 'isCurrent', !!checked)}
                                                    className="cursor-pointer"
                                                />
                                                <label htmlFor={`current-${idx}`} className="text-[11px] text-muted-foreground cursor-pointer font-bold uppercase">{dict.profile.edit_section_modal.currently_label}</label>
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
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-[#152e2b] font-bold cursor-pointer">
                        {dict.profile.edit_modal.cancel}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] px-8 font-bold transition-all shadow-lg shadow-[#05dc7f]/20 cursor-pointer"
                    >
                        {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
                    </Button>
                </div>
            </div>
        </div>
    );
}
