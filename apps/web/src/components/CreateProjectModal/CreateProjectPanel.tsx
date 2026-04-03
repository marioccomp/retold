"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { FiPlus, FiGithub, FiCheck } from "react-icons/fi";
// import styles from "./CreateProjectPanel.module.css";
import {
  createProjectAction,
  getRepositoriesAction,
} from "@/src/domains/project/actions";
import { uploadProjectImagesAction } from "@/src/domains/user/actions/upload-project-images.action";
import { toast } from "sonner";
import { SortableImageGrid, type SortableImage } from "@/components/SortableImageGrid";
import CropImageModal from "@/components/CropImageModal";
import { useTranslation } from "@/src/i18n/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Repository = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  isActive: boolean;
};

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  isModal?: boolean;
};

export default function CreateProjectPanel({ onClose, onSuccess, isModal }: Props) {
  const { dict } = useTranslation();
  const queryClient = useQueryClient();
  const t = dict.project.create_panel;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [sortableImages, setSortableImages] = useState<SortableImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortableImagesRef = useRef<SortableImage[]>([]);

  const DESCRIPTION_LIMIT = 1500;

  // Fetch repositories
  const { data: repositories = [], isLoading: isLoadingRepos } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: () => getRepositoriesAction(),
    staleTime: 0, // Always refetch
  });

  // Listen for GitHub App repository updates
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "GITHUB_APP_REPOSITORIES_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["repositories"] });
        return;
      }

      if (event.data?.type === "GITHUB_APP_NOT_LINKED_GITHUB") {
        toast.error("Conecte sua conta do GitHub nas configuracoes antes de instalar o app.");
        return;
      }

      if (event.data?.type === "GITHUB_APP_INSTALLATION_FORBIDDEN") {
        toast.error("A instalacao selecionada nao pertence a sua conta GitHub.");
        return;
      }

      if (event.data?.type === "GITHUB_APP_NOT_AUTHENTICATED") {
        toast.error(dict.auth.errors.unauthorized);
        return;
      }

      if (event.data?.type === "GITHUB_APP_FLOW_INVALID" || event.data?.type === "GITHUB_APP_ERROR") {
        toast.error(t.toast.error);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [dict.auth.errors.unauthorized, queryClient, t.toast.error]);

  useEffect(() => {
    sortableImagesRef.current = sortableImages;
  }, [sortableImages]);

  useEffect(() => {
    return () => {
      sortableImagesRef.current.forEach((img) => {
        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const totalImages = sortableImages.length + newFiles.length;

      if (totalImages > 3) {
        toast.error(t.toast.max_images);
        return;
      }

      const newSortableImages: SortableImage[] = newFiles.map((file, idx) => ({
        id: `new-${Date.now()}-${idx}`,
        preview: URL.createObjectURL(file),
        file,
        isNew: true,
      }));

      setSortableImages((prev) => [...prev, ...newSortableImages]);

      if (newSortableImages.length > 0) {
        setEditingImageId(newSortableImages[0].id);
      }

      // Reset input to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const imageToUpdate = sortableImages.find((img) => img.id === editingImageId);
    if (!imageToUpdate?.file) {
      setEditingImageId(null);
      return;
    }

    const nextPreview = URL.createObjectURL(croppedBlob);
    const fileBaseName = imageToUpdate.file.name.replace(/\.[^.]+$/, "");
    const nextFile = new File([croppedBlob], `${fileBaseName}-cropped.webp`, {
      type: croppedBlob.type || "image/webp",
    });

    setSortableImages((prev) =>
      prev.map((img) => {
        if (img.id !== editingImageId) return img;

        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }

        return {
          ...img,
          preview: nextPreview,
          file: nextFile,
          isNew: true,
        };
      })
    );

    setEditingImageId(null);
  };

  const handleRemoveImage = (id: string) => {
    const imageToRemove = sortableImages.find((img) => img.id === id);
    if (imageToRemove) {
      if (imageToRemove.preview.startsWith("blob:")) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
    }
    setSortableImages((prev) => prev.filter((img) => img.id !== id));
  };

  // GitHub App install URL
  const installUrl = "/github/install/start";

  function openCenteredPopup(url: string, title = "GitHub", w = 600, h = 700) {
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;

    const left = width / 2 - w / 2 + dualScreenLeft;
    const top = height / 2 - h / 2 + dualScreenTop;

    window.open(url, title, `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`);
  }

  const handleAddRepository = () => {
    openCenteredPopup(installUrl);
  };

  // Create Project Mutation
  const { mutate: createProject, isPending: mutationIsCreating } = useMutation({
    mutationFn: async () => {
      if (!title || !description) return;

      const result = await createProjectAction({
        title,
        description,
        visibility,
        repositoryId: selectedRepoId!,
      });

      if (!result.success) {
        throw new Error(result.message || t.toast.error);
      }

      const project = result.data;
      if (!project) throw new Error(t.toast.error);

      const filesToUpload = sortableImages.filter((img) => img.file).map((img) => img.file!);
      if (filesToUpload.length > 0) {
        setIsUploadingImages(true);
        try {
          const formData = new FormData();
          filesToUpload.forEach((file) => {
            formData.append("images", file);
          });
          await uploadProjectImagesAction(project.id, formData);
        } finally {
          setIsUploadingImages(false);
        }
      }

      return { project, remaining: result.remaining, limit: result.limit };
    },
    onSuccess: (data) => {
      if (data && data.remaining !== undefined && data.limit !== undefined) {
        toast.success(t.toast.success, {
          description: dict.project.analysis.remaining
            .replace("{remaining}", String(data.remaining))
            .replace("{limit}", String(data.limit)),
        });
      } else {
        toast.success(t.toast.success);
      }
      onSuccess();
    },
    onError: (error: unknown) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t.toast.error);
    },
  });

  const handleCreate = () => {
    createProject();
  };

  // Validation
  const isRepoValid = selectedRepoId !== null;
  const canCreate =
    title.trim() && description.trim() && isRepoValid && !mutationIsCreating && !isUploadingImages;

  return (
    <div
      className={cn(
        "bg-background overflow-hidden animate-[fadeIn_0.3s_ease-out] flex flex-col h-full",
        !isModal && "rounded-[16px] border border-border shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      )}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <div className="relative px-5 sm:px-7 py-4 sm:py-5 border-b border-border bg-gradient-to-br from-muted/50 to-background flex flex-col items-center justify-center text-center">
        <h2 className="m-0 text-xl sm:text-[1.4rem] font-black text-foreground leading-tight">{t.title}</h2>
        <p className="m-0 mt-0.5 sm:mt-1 text-xs sm:text-[0.9rem] text-muted-foreground">
          {t.subtitle}
        </p>
        
        {isModal && (
          <button
            onClick={onClose}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FiPlus size={24} className="rotate-45" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 overflow-y-auto flex-1 custom-scrollbar">
        {/* Form Section */}
        <div className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-title" className="text-[0.875rem] font-medium text-foreground">
              {t.labels.title}
            </Label>
            <Input
              id="project-title"
              type="text"
              placeholder={t.placeholders.title}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="h-auto p-[12px_14px] rounded-[10px] border-border text-foreground text-[0.95rem] focus-visible:ring-primary/30 focus-visible:border-primary"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description" className="text-sm font-bold text-foreground">
              {t.labels.description}
            </Label>
            <Textarea
              id="project-description"
              placeholder={t.placeholders.description}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_LIMIT}
              className="min-h-[140px] sm:min-h-[160px] resize-none p-3 sm:p-[12px_14px] rounded-[10px] border-border text-foreground text-[0.95rem] focus-visible:ring-primary/20 focus-visible:border-primary transition-all leading-relaxed"
            />
            <div className="flex justify-end pr-1">
              <span
                className={cn(
                  "text-[10px] font-black tracking-tight transition-colors",
                  description.length >= DESCRIPTION_LIMIT ? "text-red-500" : "text-muted-foreground/50"
                )}
              >
                {description.length}/{DESCRIPTION_LIMIT}
              </span>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-visibility" className="text-sm font-bold text-foreground">
              {t.labels.visibility}
            </Label>
            <Select
              value={visibility}
              onValueChange={(val) => setVisibility(val as "public" | "private")}
            >
              <SelectTrigger
                id="project-visibility"
                className="cursor-pointer h-auto p-3 sm:p-[12px_14px] rounded-[10px] border-border text-foreground text-[0.95rem] focus:ring-primary/20 focus:border-primary"
              >
                <SelectValue placeholder={t.placeholders.visibility} />
              </SelectTrigger>
              <SelectContent className="bg-popover" position="popper">
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

        {/* Right Column: Images & Repo */}
        <div className="flex flex-col gap-6 sm:gap-7">
          {/* Images Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="m-0 text-sm sm:text-[0.95rem] font-bold text-foreground">
                  {t.labels.images}
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">
                  {sortableImages.length}/3
                </span>
              </div>
              <p className="m-0 mt-1 text-xs text-muted-foreground leading-snug">{t.images_hint}</p>
              <p className="mt-1 text-[10px] sm:text-[0.8rem] text-primary/70 font-medium">
                {t.images_cover_hint}
              </p>
            </div>

            <SortableImageGrid
              images={sortableImages}
              onReorder={setSortableImages}
              onRemove={handleRemoveImage}
              onAddClick={() => fileInputRef.current?.click()}
              maxImages={3}
              addLabel={t.add}
              primaryLabel={t.cover_label}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Repositories Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h3 className="m-0 text-sm sm:text-[0.95rem] font-bold text-foreground">
                {t.labels.repository}
              </h3>
              <p className="m-0 mt-1 text-xs text-muted-foreground leading-snug">{t.repo_hint}</p>
            </div>

            {isLoadingRepos ? (
              <div className="p-10 text-center text-muted-foreground text-sm font-medium animate-pulse">
                {t.repo_loading}
              </div>
            ) : repositories.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {repositories.map((repo) => {
                  const isSelected = selectedRepoId === repo.id;
                  return (
                    <div
                      key={repo.id}
                      className={cn(
                        "flex items-center justify-between p-3.5 sm:p-[14px_16px] border rounded-[10px] cursor-pointer transition-all duration-200 group",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary),0.1)]"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedRepoId(repo.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedRepoId(repo.id)}
                    >
                      <span
                        className={cn(
                          "text-sm sm:text-[0.9rem] font-semibold flex items-center gap-2.5 transition-colors",
                          isSelected ? "text-primary" : "text-foreground group-hover:text-primary/80"
                        )}
                      >
                        <FiGithub size={16} />
                        {repo.name}
                      </span>
                      <span className="text-[0.75rem] font-bold text-primary">
                        {isSelected ? (
                          <span className="flex items-center gap-1 animate-in zoom-in-50">
                            <FiCheck className="stroke-[3]" /> {t.repo_selected}
                          </span>
                        ) : (
                          ""
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-[12px] bg-muted/20">
                {t.repo_none}
              </div>
            )}

            <Button
              variant="ghost"
              onClick={handleAddRepository}
              className="cursor-pointer w-full mt-1 border border-dashed border-border rounded-[10px] bg-muted/30 text-muted-foreground text-[0.85rem] sm:text-[0.9rem] font-semibold hover:border-primary hover:text-primary hover:bg-primary/5 h-auto py-3 gap-2 transition-all"
            >
              <FiPlus size={18} />
              {repositories.length > 0 ? t.repo_manage : t.repo_connect}
            </Button>
          </div>
        </div>
      </div>

      <CropImageModal
        isOpen={editingImageId !== null}
        onClose={() => setEditingImageId(null)}
        imageSrc={sortableImages.find((img) => img.id === editingImageId)?.preview ?? ""}
        aspectRatio={16 / 9}
        onCropComplete={handleCropComplete}
      />

      {/* Footer */}
      <div className="px-5 sm:px-7 py-4 sm:py-6 flex gap-3 justify-end border-t border-border bg-muted/20">
        <Button
          variant="outline"
          onClick={onClose}
          className="cursor-pointer flex-1 sm:flex-none border-border text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-background rounded-[10px] h-auto py-3 px-6 font-bold text-sm sm:text-[0.95rem] transition-all"
        >
          {t.cancel}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!canCreate}
          className="cursor-pointer flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground rounded-[10px] h-auto py-3 px-8 font-black text-sm sm:text-[0.95rem] disabled:opacity-50 transition-all shadow-lg shadow-primary/10 active:scale-95"
        >
          {mutationIsCreating || isUploadingImages ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              {isUploadingImages ? t.uploading_images : t.submitting}
            </div>
          ) : (
            t.submit
          )}
        </Button>
      </div>
    </div>
  );
}
