"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Settings, Edit3, Trash2, X, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "@/src/i18n/client";
import { deleteProjectAction, updateProjectAction } from "@/src/domains/project/actions";
import { uploadProjectImagesAction } from "@/src/domains/user/actions/upload-project-images.action";
import { deleteProjectImageAction } from "@/src/domains/user/actions/delete-project-image.action";
import { useQueryClient } from "@tanstack/react-query";
import { SortableImageGrid, type SortableImage } from "@/components/SortableImageGrid";
import CropImageModal from "@/components/CropImageModal";

type ProjectSettingsProps = {
  project: {
    id: number;
    title: string;
    description: string | null;
    images?: string[];
    ownerUsername?: string;
    visibility?: string;
  };
  onUpdate?: () => void;
  onDelete?: () => void;
  triggerClassName?: string;
};

export const ProjectSettings = ({
  project,
  onUpdate,
  onDelete,
  triggerClassName,
}: ProjectSettingsProps) => {
  const { dict } = useTranslation();
  const t = dict.project.settings_modal;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [visibility, setVisibility] = useState<"public" | "private">(
    (project.visibility as "public" | "private") || "public"
  );

  // Local state for batch editing
  type LocalImage = {
    id: string; // url or temp-id
    preview: string;
    file?: File;
    isOriginal: boolean;
    originalUrl?: string;
  };

  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]); // URLs of original images to delete
  const [imageToDelete, setImageToDelete] = useState<LocalImage | null>(null); // For confirmation modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const queryClient = useQueryClient();

  // Initialize local state when modal opens
  useEffect(() => {
    if (isEditOpen) {
      setLocalImages(
        (project.images || []).map((url) => ({
          id: url,
          preview: url,
          isOriginal: true,
          originalUrl: url,
        }))
      );
      setImagesToDelete([]);
      setTitle(project.title);
      setDescription(project.description || "");
      setVisibility((project.visibility as "public" | "private") || "public");
    }
  }, [isEditOpen, project]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = localImages.length;
    const availableSlots = 3 - currentCount;

    if (availableSlots <= 0) {
      toast.error(t.toast.max_images);
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);

    const newImages: LocalImage[] = filesToAdd.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file), // Remember to revoke later if needed
      file: file,
      isOriginal: false,
    }));

    setLocalImages((prev) => [...prev, ...newImages]);

    if (newImages.length > 0) {
      setEditingImageId(newImages[0].id);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const imageToUpdate = localImages.find((img) => img.id === editingImageId);
    if (!imageToUpdate || imageToUpdate.isOriginal) {
      setEditingImageId(null);
      return;
    }

    const nextPreview = URL.createObjectURL(croppedBlob);
    const fileBaseName = imageToUpdate.file ? imageToUpdate.file.name.replace(/\.[^.]+$/, "") : "image";
    const nextFile = new File([croppedBlob], `${fileBaseName}-cropped.webp`, {
      type: croppedBlob.type || "image/webp",
    });

    setLocalImages((prev) =>
      prev.map((img) => {
        if (img.id !== editingImageId) return img;

        if (!img.isOriginal && img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }

        return {
          ...img,
          preview: nextPreview,
          file: nextFile,
        };
      })
    );

    setEditingImageId(null);
  };

  const confirmDeleteImage = () => {
    if (!imageToDelete) return;

    // If it's an original image, mark for backend deletion
    if (imageToDelete.isOriginal && imageToDelete.originalUrl) {
      setImagesToDelete((prev) => [...prev, imageToDelete.originalUrl!]);
    }

    // Remove from local view
    setLocalImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
    setImageToDelete(null);
  };

  const hasChanges =
    title !== project.title ||
    description !== (project.description || "") ||
    visibility !== (project.visibility || "public") ||
    imagesToDelete.length > 0 ||
    localImages.some((img) => !img.isOriginal);

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditOpen(false);
      return;
    }

    if (!title.trim()) {
      toast.error(t.toast.title_required);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Process deletions
      if (imagesToDelete.length > 0) {
        // Determine if we need to execute them sequentially or if we can rely on eventual consistency
        // For safety, let's just do them.
        await Promise.all(imagesToDelete.map((url) => deleteProjectImageAction(project.id, url)));
      }

      // 2. Process uploads
      const newFiles = localImages
        .filter((img) => !img.isOriginal && img.file)
        .map((img) => img.file!);
      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach((file) => formData.append("images", file));
        await uploadProjectImagesAction(project.id, formData);
      }

      // 3. Update Text Details
      await updateProjectAction({
        id: project.id,
        title,
        description,
        visibility,
      });

      toast.success(t.toast.success);

      // Cleanup and close
      localImages.forEach((img) => {
        if (!img.isOriginal) URL.revokeObjectURL(img.preview);
      });

      queryClient.invalidateQueries({ queryKey: ["project-analysis", project.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
      queryClient.invalidateQueries({ queryKey: ["highlighted-project"] });


      if (project.ownerUsername) {
        queryClient.invalidateQueries({ queryKey: ["github-stats", project.ownerUsername] });
      }
      setIsEditOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
      toast.error(t.toast.error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProjectAction(project.id);
      toast.success(t.toast.delete_success);
      setIsDeleteOpen(false);
      if (onDelete) onDelete();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
      queryClient.invalidateQueries({ queryKey: ["highlighted-project"] });


      if (project.ownerUsername) {
        queryClient.invalidateQueries({ queryKey: ["github-stats", project.ownerUsername] });
      }
    } catch (error) {
      console.error(error);
      toast.error(t.toast.delete_error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className={
              triggerClassName ||
              "p-2 hover:bg-white/20 rounded-lg transition-colors text-white focus:outline-none outline-none focus-visible:ring-0"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 z-[110]">
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditOpen(true);
            }}
          >
            <Edit3 className="w-4 h-4" />
            <span>{t.edit_project}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.delete_project}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Modal */}
      {isEditOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setIsEditOpen(false);
              }
            }}
          >
            <div
              className="bg-background rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-muted-foreground hover:text-foreground focus:outline-none outline-none focus-visible:ring-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Project Images Management */}
                <div className="space-y-3">
                  <Label className="text-foreground font-semibold flex justify-between items-center">
                    {t.images_label}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t.max_images_hint} ({localImages.length}/3)
                    </span>
                  </Label>

                  <SortableImageGrid
                    images={localImages.map((img) => ({
                      id: img.id,
                      preview: img.preview,
                      file: img.file,
                      isNew: !img.isOriginal,
                    }))}
                    onReorder={(reordered: SortableImage[]) => {
                      const newLocalImages = reordered.map((sortable: SortableImage) => {
                        const original = localImages.find((img) => img.id === sortable.id);
                        return original!;
                      });
                      setLocalImages(newLocalImages);
                    }}
                    onRemove={(id: string) => {
                      const imgToDelete = localImages.find((img) => img.id === id);
                      if (imgToDelete) setImageToDelete(imgToDelete);
                    }}
                    onAddClick={() => fileInputRef.current?.click()}
                    maxImages={3}
                    addLabel={t.add}
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-foreground font-semibold">
                    {t.labels.title}
                  </Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.placeholders.title}
                    maxLength={100}
                    className="text-foreground bg-background border-border focus:border-primary focus:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-description" className="text-foreground font-semibold">
                    {t.labels.description}
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.placeholders.description}
                    rows={5}
                    maxLength={1500}
                    className="resize-none text-foreground bg-background border-border focus:border-primary focus:ring-primary font-medium"
                  />
                  <div className="flex justify-end pr-1">
                    <span className="text-[10px] font-black tracking-tight text-muted-foreground/50 transition-colors">
                      {description.length}/1500
                    </span>
                  </div>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label htmlFor="edit-visibility" className="text-foreground font-semibold">
                    {t.labels.visibility}
                  </Label>
                  <Select
                    value={visibility}
                    onValueChange={(val) => setVisibility(val as "public" | "private")}
                  >
                    <SelectTrigger
                      id="edit-visibility"
                      className="cursor-pointer h-auto p-[12px_14px] rounded-[10px] border-border text-foreground text-sm focus:ring-primary/30 focus:border-primary"
                    >
                      <SelectValue placeholder={t.labels.visibility} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[1100]" position="popper">
                      <SelectItem value="public" className="cursor-pointer">
                        {t.visibility_options.public}
                      </SelectItem>
                      <SelectItem value="private" className="cursor-pointer">
                        {t.visibility_options.private}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <CropImageModal
                isOpen={editingImageId !== null}
                onClose={() => setEditingImageId(null)}
                imageSrc={localImages.find((img) => img.id === editingImageId)?.preview ?? ""}
                aspectRatio={16 / 9}
                onCropComplete={handleCropComplete}
              />
              <div className="flex items-center justify-end gap-3 p-4 bg-muted/50 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setIsEditOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  {t.cancel}
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? t.saving : t.save}
                </Button>
              </div>
            </div>

            {/* Image Delete Confirmation Modal (Nested) */}
            {imageToDelete && (
              <div
                className="absolute inset-0 z-[210] flex items-center justify-center p-4 bg-black/20"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setImageToDelete(null);
                  }
                }}
              >
                <div
                  className="bg-background rounded-lg shadow-xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="font-semibold text-foreground mb-2">{t.remove_img_modal.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.remove_img_modal.description}
                  </p>
                   <div className="flex justify-end gap-2">
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => setImageToDelete(null)}
                       className="cursor-pointer"
                     >
                       {t.cancel}
                     </Button>
                     <Button
                       size="sm"
                       variant="destructive"
                       onClick={confirmDeleteImage}
                       className="cursor-pointer"
                     >
                       {t.remove_img_modal.confirm}
                     </Button>
                   </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setIsDeleteOpen(false);
              }
            }}
          >
            <div
              className="bg-background rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t.delete_project_modal.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-6 ">
                  {t.delete_project_modal.description.replace("{title}", project.title)}
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    className="w-full font-medium cursor-pointer"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? t.delete_project_modal.deleting : t.delete_project_modal.confirm}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted font-medium cursor-pointer"
                    onClick={() => setIsDeleteOpen(false)}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
