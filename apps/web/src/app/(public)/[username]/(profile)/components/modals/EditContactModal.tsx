"use client";

import { useState, useEffect } from "react";
import { FiX, FiPhone, FiMail } from "react-icons/fi";
import { toast } from "sonner";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/src/i18n/client";
import { updateProfile } from "../../../_actions/edit-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
};

export default function EditContactModal({ isOpen, onClose, profile }: Props) {
  const { dict } = useTranslation();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");

  useEffect(() => {
    if (isOpen) {
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
    }
  }, [isOpen, profile]);

  const realMutation = useMutation({
    mutationFn: async (data: any) => {
      return updateProfile(data, profile.id);
    },
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

  const hasChanges = email !== (profile.email || "") || phone !== (profile.phone || "");

  const onSave = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    realMutation.mutate({
      name: profile.name || "",
      title: profile.title || "",
      bio: profile.bio || "",
      githubUrl: profile.githubUrl || "",
      linkedinUrl: profile.linkedinUrl || "",
      websiteUrl: profile.websiteUrl || "",
      contactEmail: email,
      phone: phone,
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
      <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-semibold text-[#152e2b]">
            {dict.profile.contact_section.title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Email */}
          <div className="space-y-3">
            <Label htmlFor="email">{dict.profile.contact_section.email_label}</Label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-muted-foreground" size={16} />
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={dict.profile.contact_section.email_placeholder}
                className="pl-9 bg-white border-border/60 focus-visible:ring-[#05dc7f]"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-3">
            <Label htmlFor="phone">{dict.profile.contact_section.phone_label}</Label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-3 text-muted-foreground" size={16} />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={dict.profile.contact_section.phone_placeholder}
                className="pl-9 bg-white border-border/60 focus-visible:ring-[#05dc7f]"
              />
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
            {dict.profile.contact_section.cancel}
          </Button>
          <Button
            onClick={onSave}
            disabled={realMutation.isPending || !hasChanges}
            className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] px-8 font-bold transition-all shadow-lg shadow-[#05dc7f]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {realMutation.isPending ? dict.profile.saving : dict.profile.contact_section.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
