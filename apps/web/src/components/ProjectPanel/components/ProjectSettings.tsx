"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Settings, Edit3, Trash2, X, AlertTriangle, ImagePlus, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { deleteProjectAction, updateProjectAction } from "@/src/domains/project/actions";
import { uploadProjectImagesAction } from "@/src/domains/user/actions/upload-project-images.action";
import { useQueryClient } from "@tanstack/react-query";

type ProjectSettingsProps = {
    project: {
        id: number;
        title: string;
        description: string | null;
        images?: string[];
    };
    onUpdate?: () => void;
    onDelete?: () => void;
    triggerClassName?: string;
};

export const ProjectSettings = ({ project, onUpdate, onDelete, triggerClassName }: ProjectSettingsProps) => {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [title, setTitle] = useState(project.title);
    const [description, setDescription] = useState(project.description || "");
    const [coverPreview, setCoverPreview] = useState<string | null>(project.images?.[0] ?? null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const queryClient = useQueryClient();

    const handleUpdate = async () => {
        if (!title.trim()) {
            toast.error("O título não pode estar vazio");
            return;
        }

        setIsUpdating(true);
        try {
            await updateProjectAction({
                id: project.id,
                title,
                description,
            });
            toast.success("Projeto atualizado com sucesso!");
            setIsEditOpen(false);
            if (onUpdate) onUpdate();
            queryClient.invalidateQueries({ queryKey: ["project-analysis", project.id] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar projeto");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setCoverPreview(previewUrl);

        setIsUploadingCover(true);
        const formData = new FormData();
        formData.append("images", file);

        try {
            const result = await uploadProjectImagesAction(project.id, formData);
            if (!result.success) {
                toast.error(result.message);
                setCoverPreview(project.images?.[0] ?? null);
            } else {
                toast.success("Cover image updated!");
                queryClient.invalidateQueries({ queryKey: ["project-analysis", project.id] });
                queryClient.invalidateQueries({ queryKey: ["profile"] });
            }
        } catch {
            toast.error("Unexpected error uploading cover.");
            setCoverPreview(project.images?.[0] ?? null);
        } finally {
            setIsUploadingCover(false);
            URL.revokeObjectURL(previewUrl);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteProjectAction(project.id);
            toast.success("Projeto excluído com sucesso!");
            setIsDeleteOpen(false);
            if (onDelete) onDelete();
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir projeto");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        className={triggerClassName || "p-2 hover:bg-white/20 rounded-lg transition-colors text-white focus:outline-none outline-none focus-visible:ring-0"}
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
                        <span>Editar projeto</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDeleteOpen(true);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir projeto</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Modal */}
            {isEditOpen && mounted && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsEditOpen(false);
                    }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Editar Projeto</h3>
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="text-gray-400 hover:text-gray-500 focus:outline-none outline-none focus-visible:ring-0 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Cover Image Upload */}
                            <div className="space-y-2">
                                <Label className="text-slate-950 font-semibold">Cover Image</Label>
                                <div
                                    className="relative w-full h-32 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden cursor-pointer hover:border-[#05dc7f] transition-colors bg-slate-50"
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    {coverPreview ? (
                                        <img
                                            src={coverPreview}
                                            alt="Cover preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <ImagePlus className="w-8 h-8 mb-2" />
                                            <span className="text-sm">Click to upload</span>
                                        </div>
                                    )}
                                    {isUploadingCover && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    name="images"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-title" className="text-slate-950 font-semibold">Título</Label>
                                <Input
                                    id="edit-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Nome do projeto"
                                    maxLength={100}
                                    className="text-slate-900 bg-white border-slate-300 focus:border-[#05dc7f] focus:ring-[#05dc7f] font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description" className="text-slate-950 font-semibold">Descrição</Label>
                                <Textarea
                                    id="edit-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descrição breve"
                                    rows={4}
                                    maxLength={280}
                                    className="resize-none text-slate-900 bg-white border-slate-300 focus:border-[#05dc7f] focus:ring-[#05dc7f] font-medium"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t">
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditOpen(false)}
                                className="text-gray-600 hover:text-gray-900 hover:bg-gray-200 cursor-pointer"
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-[#04a660] hover:bg-[#038c51] text-white font-medium px-6 cursor-pointer shadow-sm"
                                onClick={handleUpdate}
                                disabled={isUpdating}
                            >
                                {isUpdating ? "Salvando..." : "Salvar alterações"}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteOpen && mounted && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteOpen(false);
                    }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluir Projeto?</h3>
                            <p className="text-gray-500 text-sm mb-6 ">
                                Tem certeza que deseja excluir "{project.title}"? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="destructive"
                                    className="w-full font-medium cursor-pointer"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Excluindo..." : "Sim, excluir projeto"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium cursor-pointer"
                                    onClick={() => setIsDeleteOpen(false)}
                                >
                                    Cancelar
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
