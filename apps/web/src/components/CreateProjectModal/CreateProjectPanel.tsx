"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { FiPlus, FiGithub, FiCheck } from "react-icons/fi";
// import styles from "./CreateProjectPanel.module.css";
import {
    createProjectAction,
    getRepositoriesAction,
    verifyUserInstallation,
} from "@/src/domains/project/actions";
import { uploadProjectImagesAction } from "@/src/domains/user/actions/upload-project-images.action";
import { toast } from "sonner";
import { SortableImageGrid, type SortableImage } from "@/components/SortableImageGrid";
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
};

export default function CreateProjectPanel({ onClose, onSuccess }: Props) {
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Track object URLs for cleanup
    const generatedUrls = useRef<string[]>([]);

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
            }
        }

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [queryClient]);

    // Cleanup previews on unmount
    useEffect(() => {
        return () => {
            sortableImages.forEach((img) => URL.revokeObjectURL(img.preview));
        };
    }, [sortableImages]);

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

            setSortableImages([...sortableImages, ...newSortableImages]);

            // Reset input to allow selecting same file again
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = (id: string) => {
        const imageToRemove = sortableImages.find(img => img.id === id);
        if (imageToRemove) {
            URL.revokeObjectURL(imageToRemove.preview);
        }
        setSortableImages(sortableImages.filter(img => img.id !== id));
    };

    // GitHub App install URL
    const appSlug = "retold-inc";
    const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

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
        if (repositories.length === 0) {
            verifyUserInstallation();
        }
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

            const filesToUpload = sortableImages.filter(img => img.file).map(img => img.file!);
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
        onError: (error: any) => {
            console.error(error);
            toast.error(error.message || t.toast.error);
        }
    });

    const handleCreate = () => {
        createProject();
    };

    // Validation
    const isRepoValid = selectedRepoId !== null;
    const canCreate = title.trim() && description.trim() && isRepoValid && !mutationIsCreating && !isUploadingImages;

    return (
        <div className="bg-white rounded-[16px] border border-[#e7eae9] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Header */}
            <div className="px-7 py-5 border-b border-[#e7eae9] bg-gradient-to-br from-[#fafafa] to-white">
                <h2 className="m-0 text-[1.4rem] font-semibold text-[#152e2b]">{t.title}</h2>
                <p className="m-[6px_0_0] text-[0.9rem] text-[#6b7c7a]">{t.subtitle}</p>
            </div>

            {/* Content */}
            <div className="p-7 grid grid-cols-1 min-[900px]:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="flex flex-col gap-5">
                    {/* Title */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-title" className="text-[0.875rem] font-medium text-[#152e2b]">{t.labels.title}</Label>
                        <Input
                            id="project-title"
                            type="text"
                            placeholder={t.placeholders.title}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                            className="h-auto p-[12px_14px] rounded-[10px] border-[#e7eae9] text-[#152e2b] text-[0.95rem] focus-visible:ring-[#05dc7f]/30 focus-visible:border-[#05dc7f]"
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-description" className="text-[0.875rem] font-medium text-[#152e2b]">{t.labels.description}</Label>
                        <Textarea
                            id="project-description"
                            placeholder={t.placeholders.description}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={280}
                            className="min-h-[100px] resize-none p-[12px_14px] rounded-[10px] border-[#e7eae9] text-[#152e2b] text-[0.95rem] focus-visible:ring-[#05dc7f]/30 focus-visible:border-[#05dc7f]"
                        />
                    </div>

                    {/* Visibility */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-visibility" className="text-[0.875rem] font-medium text-[#152e2b]">{t.labels.visibility}</Label>
                        <Select
                            value={visibility}
                            onValueChange={(val) => setVisibility(val as "public" | "private")}
                        >
                            <SelectTrigger id="project-visibility" className="cursor-pointer h-auto p-[12px_14px] rounded-[10px] border-[#e7eae9] text-[#152e2b] text-[0.95rem] focus:ring-[#05dc7f]/30 focus:border-[#05dc7f]">
                                <SelectValue placeholder={t.placeholders.visibility} />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="public" className="cursor-pointer">{t.visibility_options.public}</SelectItem>
                                <SelectItem value="private" className="cursor-pointer">{t.visibility_options.private}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Right Column: Images & Repo */}
                <div className="flex flex-col gap-6">
                    {/* Images Section */}
                    <div className="flex flex-col gap-3">
                        <div>
                            <div className="flex justify-between items-center">
                                <h3 className="m-0 text-[0.95rem] font-semibold text-[#152e2b]">{t.labels.images}</h3>
                                <span className="text-[0.8rem] text-[#6b7c7a]">{sortableImages.length}/3</span>
                            </div>
                            <p className="m-0 text-[0.85rem] text-[#6b7c7a]">{t.images_hint}</p>
                        </div>

                        <SortableImageGrid
                            images={sortableImages}
                            onReorder={setSortableImages}
                            onRemove={handleRemoveImage}
                            onAddClick={() => fileInputRef.current?.click()}
                            maxImages={3}
                            addLabel={t.add}
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
                    <div className="flex flex-col gap-3">
                        <div>
                            <h3 className="m-0 text-[0.95rem] font-semibold text-[#152e2b]">{t.labels.repository}</h3>
                            <p className="m-0 text-[0.85rem] text-[#6b7c7a]">{t.repo_hint}</p>
                        </div>

                        {isLoadingRepos ? (
                            <div className="p-[30px] text-center text-[#6b7c7a] text-[0.9rem]">{t.repo_loading}</div>
                        ) : repositories.length > 0 ? (
                            <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                                {repositories.map((repo) => {
                                    const isSelected = selectedRepoId === repo.id;
                                    return (
                                        <div
                                            key={repo.id}
                                            className={cn(
                                                "flex items-center justify-between p-[14px_16px] border rounded-[10px] cursor-pointer transition-all duration-200",
                                                isSelected
                                                    ? "border-[#05dc7f] bg-[#05dc7f]/6"
                                                    : "border-[#e7eae9] hover:border-[#b8bfbd] hover:bg-[#fafafa]"
                                            )}
                                            onClick={() => setSelectedRepoId(repo.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && setSelectedRepoId(repo.id)}
                                        >
                                            <span className="text-[0.9rem] text-[#152e2b] font-medium flex items-center gap-2">
                                                <FiGithub />
                                                {repo.name}
                                            </span>
                                            <span className="text-[0.8rem] font-medium text-[#05dc7f]">
                                                {isSelected ? <span className="flex items-center gap-1"><FiCheck /> {t.repo_selected}</span> : ""}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-[#6b7c7a] text-[0.9rem] border border-dashed border-[#e7eae9] rounded-[10px] bg-[#fafafa]">
                                {t.repo_none}
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            onClick={handleAddRepository}
                            className="cursor-pointer w-full mt-1 border border-dashed border-[#e7eae9] rounded-[10px] bg-[#fafafa] text-[#6b7c7a] text-[0.9rem] font-medium hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[#05dc7f]/4 h-auto py-3 gap-2"
                        >
                            <FiPlus size={18} />
                            {repositories.length > 0 ? t.repo_manage : t.repo_connect}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-5 md:py-6 flex gap-3 justify-end border-t border-[#e7eae9] bg-[#fafafa]">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="cursor-pointer border-[#e7eae9] text-[#6b7c7a] hover:text-[#152e2b] hover:border-[#152e2b] hover:bg-white rounded-[10px] h-auto py-3 px-6 font-medium text-[0.95rem]"
                >
                    {t.cancel}
                </Button>
                <Button
                    onClick={handleCreate}
                    disabled={!canCreate}
                    className="cursor-pointer bg-[#05dc7f] hover:bg-[#03c56f] text-[#0f2f28] rounded-[10px] h-auto py-3 px-7 font-semibold text-[0.95rem] disabled:opacity-50"
                >
                    {mutationIsCreating || isUploadingImages ? (
                        <>
                            {isUploadingImages ? t.uploading_images : t.submitting}
                        </>
                    ) : (
                        t.submit
                    )}
                </Button>
            </div>
        </div>
    );
}
