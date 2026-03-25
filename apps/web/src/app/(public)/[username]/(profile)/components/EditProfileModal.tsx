"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiX,
  FiGithub,
  FiLinkedin,
  FiUser,
  FiType,
  FiAlignLeft,
  FiCamera,
  FiGlobe,
  FiImage,
  FiEdit2,
} from "react-icons/fi";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../../_actions/edit-profile";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { uploadAvatarAction } from "@/src/domains/user/actions/upload-avatar.actions";
import { uploadCoverAction } from "@/src/domains/user/actions/upload-cover.actions";
import { useTranslation } from "@/src/i18n/client";
import CropImageModal from "./CropImageModal";

import { useSession } from "next-auth/react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
  username: string;
};

export default function EditProfileModal({ isOpen, onClose, profile, username }: Props) {
  const { dict } = useTranslation();
  const { data: session, update } = useSession();
  const [name, setName] = useState(profile.name ?? "");
  const [title, setTitle] = useState(profile.title ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.image ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(profile.cover ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setName(profile.name ?? "");
      setTitle(profile.title ?? "");
      setBio(profile.bio ?? "");
      setGithubUrl(profile.githubUrl ?? "");
      setLinkedinUrl(profile.linkedinUrl ?? "");
      setWebsiteUrl(profile.websiteUrl ?? "");
      setAvatarPreview(profile.image ?? null);
      setCoverPreview(profile.cover ?? null);
      setPendingAvatarFile(null);
    }
  }, [isOpen, profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      // Upload avatar first if there's a pending file
      if (pendingAvatarFile) {
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append("avatar", pendingAvatarFile);
        const avatarResult = await uploadAvatarAction(formData);
        setIsUploadingAvatar(false);

        if (!avatarResult.success) {
          throw new Error(avatarResult.message || dict.profile.edit_modal.avatar_error);
        }

        // Update session with new avatar
        await update({
          ...session,
          user: {
            ...session?.user,
            image: avatarResult.data,
          },
        });
      }

      return updateProfile(
        {
          name,
          title,
          bio,
          githubUrl,
          linkedinUrl,
          websiteUrl,
        },
        profile.id
      );
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
      setPendingAvatarFile(null);
      toast.success(dict.profile.edit_modal.success);
      update();
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      onClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : dict.profile.edit_modal.unexpected_error
      );
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) {
    let file: File | undefined;

    if ("target" in e && (e.target as HTMLInputElement).files) {
      file = (e.target as HTMLInputElement).files?.[0];
    } else if ("dataTransfer" in e) {
      file = e.dataTransfer.files?.[0];
    }

    if (!file) return;

    // Reset input so the same file can be re-selected
    if ("target" in e && (e.target as HTMLInputElement).value) {
      (e.target as HTMLInputElement).value = "";
    }

    const previewUrl = URL.createObjectURL(file);
    setImageToCrop(previewUrl);
    setCropModalOpen(true);
  }

  const handleCroppedAvatar = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "avatar.webp", { type: "image/webp" });
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);
    setPendingAvatarFile(croppedFile);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleAvatarChange(e);
  };

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
      <div className="bg-background w-full max-w-[550px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{dict.profile.edit_modal.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-muted text-muted-foreground transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Avatar Upload */}
          <div
            className={`flex flex-col items-center py-6 rounded-2xl border-2 border-dashed transition-all duration-200 relative group cursor-pointer
                            ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-background hover:border-primary hover:bg-primary/5"}
                            ${isUploadingAvatar ? "pointer-events-none opacity-80" : ""}
                        `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="relative">
              <Avatar
                className={`w-28 h-28 border-4 border-white shadow-md transition-transform duration-300 ${isDragging ? "scale-110" : "group-hover:scale-105"}`}
              >
                <AvatarImage
                  src={avatarPreview ?? undefined}
                  alt={dict.profile.alt_avatar}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl font-bold text-foreground bg-muted">
                  {(profile.name || username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Overlay on hover inside modal */}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FiCamera className="text-white" size={24} />
              </div>

              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110">
                {isUploadingAvatar ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiCamera size={16} />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-foreground">
                {isUploadingAvatar ? dict.profile.edit_modal.saving : dict.profile.change_photo}
              </span>
              <span className="text-xs text-muted-foreground text-center px-4">
                {isDragging
                  ? "Solte para enviar"
                  : dict.profile.edit_modal.avatar_hint + " ou arraste uma foto"}
              </span>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FiUser className="text-primary" />
              {dict.profile.edit_modal.name_label}
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
              placeholder={dict.profile.edit_modal.name_placeholder}
              maxLength={20}
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FiType className="text-primary" />
              {dict.profile.edit_modal.job_label}
            </Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
              placeholder={dict.profile.edit_modal.job_placeholder}
              maxLength={50}
            />
          </div>

          {/* Bio / Headline */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FiAlignLeft className="text-primary" />
              {dict.profile.edit_modal.headline_label}
            </Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="bg-background resize-none min-h-[60px]"
              placeholder={dict.profile.edit_modal.headline_placeholder}
              maxLength={100}
            />
            <span className="text-xs text-muted-foreground text-right">{bio.length}/100</span>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Social Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {dict.profile.edit_modal.social_title}
            </h3>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FiGithub className="text-primary" />
                {dict.profile.edit_modal.github_label}
              </Label>
              <Input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="bg-background"
                placeholder={dict.profile.edit_modal.github_placeholder}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FiLinkedin className="text-primary" />
                {dict.profile.edit_modal.linkedin_label}
              </Label>
              <Input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="bg-background"
                placeholder={dict.profile.edit_modal.linkedin_placeholder}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FiGlobe className="text-primary" />
                {dict.profile.edit_modal.website_label}
              </Label>
              <Input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-background"
                placeholder={dict.profile.edit_modal.website_placeholder}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border flex justify-end gap-3 bg-muted/40">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-muted-foreground hover:bg-muted cursor-pointer hover:text-foreground"
          >
            {dict.profile.edit_modal.cancel}
          </Button>
          <Button
            onClick={() => {
              const hasChanges =
                name !== (profile.name ?? "") ||
                title !== (profile.title ?? "") ||
                bio !== (profile.bio ?? "") ||
                githubUrl !== (profile.githubUrl ?? "") ||
                linkedinUrl !== (profile.linkedinUrl ?? "") ||
                websiteUrl !== (profile.websiteUrl ?? "") ||
                !!pendingAvatarFile;

              if (hasChanges) {
                updateProfileMutation.mutate();
              } else {
                onClose();
              }
            }}
            disabled={
              updateProfileMutation.isPending ||
              (name === (profile.name ?? "") &&
                title === (profile.title ?? "") &&
                bio === (profile.bio ?? "") &&
                githubUrl === (profile.githubUrl ?? "") &&
                linkedinUrl === (profile.linkedinUrl ?? "") &&
                websiteUrl === (profile.websiteUrl ?? "") &&
                !pendingAvatarFile)
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer hover:scale-[1.02] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {updateProfileMutation.isPending
              ? dict.profile.edit_modal.saving
              : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>

      <CropImageModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          if (imageToCrop?.startsWith("blob:")) {
            URL.revokeObjectURL(imageToCrop);
          }
          setImageToCrop(null);
        }}
        imageSrc={imageToCrop ?? ""}
        aspectRatio={1}
        onCropComplete={handleCroppedAvatar}
      />
    </div>
  );
}
