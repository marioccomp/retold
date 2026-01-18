"use client";

import { useState, useEffect } from "react";
import { FiX, FiGithub, FiLinkedin, FiUser, FiType, FiAlignLeft } from "react-icons/fi";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../../_actions/edit-profile";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/src/i18n/client";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    profile: PublicProfileDTO;
    username: string;
};

export default function EditProfileModal({ isOpen, onClose, profile, username }: Props) {
    const { dict } = useTranslation();
    const [name, setName] = useState(profile.name ?? "");
    const [title, setTitle] = useState(profile.title ?? "");
    const [bio, setBio] = useState(profile.bio ?? "");
    const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
    const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");

    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            setName(profile.name ?? "");
            setTitle(profile.title ?? "");
            setBio(profile.bio ?? "");
            setGithubUrl(profile.githubUrl ?? "");
            setLinkedinUrl(profile.linkedinUrl ?? "");
        }
    }, [isOpen, profile]);

    const updateProfileMutation = useMutation({
        mutationFn: async () => {
            return updateProfile({
                name,
                title,
                bio,
                githubUrl,
                linkedinUrl,
            }, profile.id);
        },
        onSuccess: (data) => {
            if (!data.success) {
                // Se houver erros de campo específicos, mostre o primeiro encontrado
                if (data.fieldErrors) {
                    const firstError = Object.values(data.fieldErrors).flat()[0];
                    if (firstError) {
                        toast.error(firstError);
                        return;
                    }
                }

                toast.error(data.message || dict.profile.edit_modal.error);
                return;
            }
            toast.success(dict.profile.edit_modal.success);
            queryClient.invalidateQueries({ queryKey: ["profile", username] });
            onClose();
        },
        onError: () => {
            toast.error(dict.profile.edit_modal.unexpected_error);
        },
    });

    if (!isOpen) return null;

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onMouseDown={handleOverlayMouseDown}
        >
            <div className="bg-white w-full max-w-[550px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7eae9]">
                    <h2 className="text-xl font-semibold text-[#152e2b]">{dict.profile.edit_modal.title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-[#f3f6f5] text-[#6b7c7a] transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                            <FiUser className="text-[#05dc7f]" />
                            {dict.profile.edit_modal.name_label}
                        </Label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                            placeholder={dict.profile.edit_modal.name_placeholder}
                            maxLength={20}
                        />
                    </div>

                    {/* Title */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                            <FiType className="text-[#05dc7f]" />
                            {dict.profile.edit_modal.job_label}
                        </Label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                            placeholder={dict.profile.edit_modal.job_placeholder}
                            maxLength={50}
                        />
                    </div>

                    {/* Bio / Headline */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                            <FiAlignLeft className="text-[#05dc7f]" />
                            {dict.profile.edit_modal.headline_label}
                        </Label>
                        <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={2}
                            className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8] resize-none min-h-[60px]"
                            placeholder={dict.profile.edit_modal.headline_placeholder}
                            maxLength={100}
                        />
                        <span className="text-xs text-[#6b7c7a] text-right">{bio.length}/100</span>
                    </div>

                    <div className="h-px bg-[#e7eae9] my-1" />

                    {/* Social Links */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-[#6b7c7a] uppercase tracking-wider">{dict.profile.edit_modal.social_title}</h3>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                                <FiGithub className="text-[#05dc7f]" />
                                {dict.profile.edit_modal.github_label}
                            </Label>
                            <Input
                                type="text"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                                placeholder={dict.profile.edit_modal.github_placeholder}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                                <FiLinkedin className="text-[#05dc7f]" />
                                {dict.profile.edit_modal.linkedin_label}
                            </Label>
                            <Input
                                type="text"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                                placeholder={dict.profile.edit_modal.linkedin_placeholder}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-[#e7eae9] flex justify-end gap-3 bg-[#fafafa]">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="text-[#6b7c7a] hover:bg-[#e7eae9] cursor-pointer hover:text-[#152e2b]"
                    >
                        {dict.profile.edit_modal.cancel}
                    </Button>
                    <Button
                        onClick={() => updateProfileMutation.mutate()}
                        disabled={updateProfileMutation.isPending}
                        className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] transition-all cursor-pointer hover:scale-[1.02] shadow-[0_4px_12px_rgba(5,220,127,0.2)]"
                    >
                        {updateProfileMutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
                    </Button>
                </div>
            </div>
        </div>
    );
}
