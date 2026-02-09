"use client";

import { useState, useRef } from "react";
import { useTranslation } from "@/src/i18n/client";
import { FiEdit2 } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { uploadCoverAction } from "@/src/domains/user/actions/upload-cover.actions";
import { toast } from "sonner";
import CropImageModal from "../CropImageModal";

type Props = {
  cover?: string | null;
  ownProfile: boolean;
  username: string;
};

export default function ProfileBanner({ cover, ownProfile, username }: Props) {
  const { dict } = useTranslation();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    const previewUrl = URL.createObjectURL(file);
    setImageToCrop(previewUrl);
    setCropModalOpen(true);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("cover", croppedBlob, "cover.webp");

    try {
      const result = await uploadCoverAction(formData);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success("Capa atualizada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["profile", username] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    } catch {
      toast.error("Erro ao atualizar capa.");
    } finally {
      setIsUploading(false);
      if (imageToCrop && imageToCrop.startsWith("blob:")) {
        URL.revokeObjectURL(imageToCrop);
      }
      setImageToCrop(null);
    }
  };

  return (
    <section className="py-6 px-5 sm:px-8 md:px-8 lg:px-8 xl:px-16 relative">
      <div className="relative group rounded-xl overflow-hidden shadow-sm">
        {cover ? (
          <img
            src={cover}
            className="w-full h-[160px] sm:h-[200px] md:h-[250px] object-cover block"
            alt={dict.profile.alt_cover}
          />
        ) : (
          <div
            className="w-full h-[160px] sm:h-[200px] md:h-[250px] bg-gradient-to-r from-[#33bd19] to-[#05dc7f]"
            aria-label={dict.profile.alt_cover}
          />
        )}

        {/* Edit Button */}
        {ownProfile && (
          <>
            <button
              onClick={() => !isUploading && fileInputRef.current?.click()}
              disabled={isUploading}
              className={`absolute top-4 right-4 bg-white/90 hover:bg-white text-[#152e2b] p-2 rounded-full shadow-md transition-all duration-200 
                                ${isUploading ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"}
                            `}
              title="Alterar capa"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-[#152e2b] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiEdit2 size={20} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      <CropImageModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          if (imageToCrop && imageToCrop.startsWith("blob:")) {
            URL.revokeObjectURL(imageToCrop);
          }
          setImageToCrop(null);
        }}
        imageSrc={imageToCrop ?? ""}
        aspectRatio={1065 / 250}
        onCropComplete={handleCroppedImage}
      />
    </section>
  );
}
