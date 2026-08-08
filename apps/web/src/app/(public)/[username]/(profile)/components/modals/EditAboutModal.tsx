"use client";

import { useState } from "react";
import { FiX, FiBookOpen } from "react-icons/fi";
import { toast } from "sonner";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/src/i18n/client";
import { updateProfileDetails } from "../../../_actions/edit-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfileDTO;
};

export default function EditAboutModal({ isOpen, onClose, profile }: Props) {
  const { dict } = useTranslation();
  const queryClient = useQueryClient();
  const [longBio, setLongBio] = useState(profile.longBio ?? "");

  // Reset the form from `profile` on the moment the modal opens, without a
  // useEffect: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setLongBio(profile.longBio ?? "");
    }
  }

  const mutation = useMutation({
    mutationFn: (data: { longBio: string | null }) => updateProfileDetails(data),
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

  const handleSave = () => {
    mutation.mutate({ longBio });
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
      <div className="bg-background w-full md:max-w-[620px] h-[96dvh] md:h-auto md:max-h-[85dvh] rounded-t-[2rem] md:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-xl font-semibold text-foreground">{dict.profile.about_section}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            <Textarea
              value={longBio}
              onChange={(e) => setLongBio(e.target.value)}
              className="min-h-[250px] md:min-h-[350px] resize-none font-medium border-border/60 rounded-xl focus-visible:ring-primary/20"
              placeholder={dict.profile.edit_section_modal.long_bio_placeholder}
            />
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
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
