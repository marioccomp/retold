"use client";

import { useState, useEffect, useRef } from "react";
import { FiX, FiGithub, FiLinkedin, FiUser, FiType, FiAlignLeft, FiCamera } from "react-icons/fi";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../../_actions/edit-profle";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { uploadAvatarAction } from "@/src/domains/user/actions/upload-avatar.actions";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    profile: PublicProfileDTO;
    username: string;
};

export default function EditProfileModal({ isOpen, onClose, profile, username }: Props) {
    const [name, setName] = useState(profile.name ?? "");
    const [title, setTitle] = useState(profile.title ?? "");
    const [bio, setBio] = useState(profile.bio ?? "");
    const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
    const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.image ?? null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            setName(profile.name ?? "");
            setTitle(profile.title ?? "");
            setBio(profile.bio ?? "");
            setGithubUrl(profile.githubUrl ?? "");
            setLinkedinUrl(profile.linkedinUrl ?? "");
            setAvatarPreview(profile.image ?? null);
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

                toast.error(data.message || "Erro ao atualizar perfil");
                return;
            }
            toast.success("Perfil atualizado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["profile", username] });
            onClose();
        },
        onError: () => {
            toast.error("Erro inesperado ao atualizar perfil");
        },
    });

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);

        // Upload the file
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append("avatar", file);

        try {
            const result = await uploadAvatarAction(formData);
            if (result.error) {
                toast.error(result.error);
                setAvatarPreview(profile.image ?? null);
            } else {
                toast.success("Avatar updated successfully!");
                queryClient.invalidateQueries({ queryKey: ["profile", username] });
            }
        } catch {
            toast.error("Unexpected error uploading avatar.");
            setAvatarPreview(profile.image ?? null);
        } finally {
            setIsUploadingAvatar(false);
            URL.revokeObjectURL(previewUrl);
        }
    }

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
                    <h2 className="text-xl font-semibold text-[#152e2b]">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-[#f3f6f5] text-[#6b7c7a] transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <Avatar className="w-24 h-24 border-2 border-[#e7eae9]">
                                <AvatarImage
                                    src={avatarPreview ?? undefined}
                                    alt="Profile avatar"
                                    className="object-cover"
                                />
                                <AvatarFallback className="text-2xl font-bold text-[#152e2b] bg-[#f3f6f5]">
                                    {(profile.name || username || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <Button
                                size="icon"
                                type="button"
                                disabled={isUploadingAvatar}
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full border-none bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] hover:scale-105 transition-all duration-200 cursor-pointer"
                            >
                                {isUploadingAvatar ? (
                                    <span className="w-4 h-4 border-2 border-[#0f2f28] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiCamera size={14} />
                                )}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                name="avatar"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                        <span className="text-xs text-[#6b7c7a]">Click to upload a new avatar</span>
                    </div>

                    <div className="h-px bg-[#e7eae9] my-1" />

                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                            <FiUser className="text-[#05dc7f]" />
                            Name
                        </Label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                            placeholder="Your full name"
                            maxLength={20}
                        />
                    </div>

                    {/* Title */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                            <FiType className="text-[#05dc7f]" />
                            Title / Job
                        </Label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                            placeholder="Ex: Full Stack Developer"
                            maxLength={50}
                        />
                    </div>

                    {/* Bio */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                            <FiAlignLeft className="text-[#05dc7f]" />
                            About
                        </Label>
                        <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8] resize-none min-h-[100px]"
                            placeholder="Tell us a little bit about yourself"
                            maxLength={280}
                        />
                        <span className="text-xs text-[#6b7c7a] text-right">{bio.length}/280</span>
                    </div>

                    <div className="h-px bg-[#e7eae9] my-1" />

                    {/* Social Links */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-[#6b7c7a] uppercase tracking-wider">Social Media</h3>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                                <FiGithub className="text-[#05dc7f]" />
                                GitHub URL
                            </Label>
                            <Input
                                type="text"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                                placeholder="github.com/seu-usuario"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium text-[#152e2b] flex items-center gap-2">
                                <FiLinkedin className="text-[#05dc7f]" />
                                LinkedIn URL
                            </Label>
                            <Input
                                type="text"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                className="bg-white border-[#e7eae9] focus-visible:ring-[#05dc7f] text-[#152e2b] placeholder:text-[#a0aaa8]"
                                placeholder="linkedin.com/in/seu-usuario"
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
                        Cancel
                    </Button>
                    <Button
                        onClick={() => updateProfileMutation.mutate()}
                        disabled={updateProfileMutation.isPending}
                        className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] transition-all cursor-pointer hover:scale-[1.02] shadow-[0_4px_12px_rgba(5,220,127,0.2)]"
                    >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
