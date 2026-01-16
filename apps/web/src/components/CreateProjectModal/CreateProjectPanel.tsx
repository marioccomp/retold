"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiGithub, FiCheck } from "react-icons/fi";
// import styles from "./CreateProjectPanel.module.css";
import {
    createProjectAction,
    getRepositoriesAction,
    verifyUserInstallation,
} from "@/src/domains/project/actions";
import { toast } from "sonner";
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
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

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

    const handleCreate = async () => {
        if (!title || !description || !selectedRepoId) return;

        setIsCreating(true);
        try {
            await createProjectAction({
                title,
                description,
                visibility,
                repositoryId: selectedRepoId,
            });

            toast.success("Projeto criado com sucesso!");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar projeto. Tente novamente.");
        } finally {
            setIsCreating(false);
        }
    };

    const canCreate = title.trim() && description.trim() && selectedRepoId && !isCreating;

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
                <h2 className="m-0 text-[1.4rem] font-semibold text-[#152e2b]">Novo projeto</h2>
                <p className="m-[6px_0_0] text-[0.9rem] text-[#6b7c7a]">Preencha as informações do seu novo projeto</p>
            </div>

            {/* Content */}
            <div className="p-7 grid grid-cols-1 min-[900px]:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="flex flex-col gap-5">
                    {/* Title */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-title" className="text-[0.875rem] font-medium text-[#152e2b]">Título</Label>
                        <Input
                            id="project-title"
                            type="text"
                            placeholder="Nome do seu projeto"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                            className="h-auto p-[12px_14px] rounded-[10px] border-[#e7eae9] text-[#152e2b] text-[0.95rem] focus-visible:ring-[#05dc7f]/30 focus-visible:border-[#05dc7f]"
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-description" className="text-[0.875rem] font-medium text-[#152e2b]">Descrição</Label>
                        <Textarea
                            id="project-description"
                            placeholder="Uma breve descrição do projeto"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={280}
                            className="min-h-[100px] resize-none p-[12px_14px] rounded-[10px] border-[#e7eae9] text-[#152e2b] text-[0.95rem] focus-visible:ring-[#05dc7f]/30 focus-visible:border-[#05dc7f]"
                        />
                    </div>

                    {/* Visibility */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-visibility" className="text-[0.875rem] font-medium text-[#152e2b]">Visibilidade</Label>
                        <Select
                            value={visibility}
                            onValueChange={(val) => setVisibility(val as "public" | "private")}
                        >
                            <SelectTrigger id="project-visibility" className="cursor-pointer h-auto p-[12px_14px] rounded-[10px] border-[#e7eae9] text-[#152e2b] text-[0.95rem] focus:ring-[#05dc7f]/30 focus:border-[#05dc7f]">
                                <SelectValue placeholder="Selecione a visibilidade" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="public" className="cursor-pointer">Público</SelectItem>
                                <SelectItem value="private" className="cursor-pointer">Privado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Repositories Section */}
                <div className="flex flex-col gap-3">
                    <div>
                        <h3 className="m-0 text-[0.95rem] font-semibold text-[#152e2b]">Repositório</h3>
                        <p className="m-0 text-[0.85rem] text-[#6b7c7a]">Selecione um repositório do GitHub</p>
                    </div>

                    {isLoadingRepos ? (
                        <div className="p-[30px] text-center text-[#6b7c7a] text-[0.9rem]">Carregando repositórios...</div>
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
                                            {isSelected ? <span className="flex items-center gap-1"><FiCheck /> Selecionado</span> : ""}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-[#6b7c7a] text-[0.9rem] border border-dashed border-[#e7eae9] rounded-[10px] bg-[#fafafa]">
                            Nenhum repositório conectado ainda.
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        onClick={handleAddRepository}
                        className="cursor-pointer w-full mt-1 border border-dashed border-[#e7eae9] rounded-[10px] bg-[#fafafa] text-[#6b7c7a] text-[0.9rem] font-medium hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[#05dc7f]/4 h-auto py-3 gap-2"
                    >
                        <FiPlus size={18} />
                        {repositories.length > 0 ? "Gerenciar repositórios" : "Conectar repositórios"}
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-5 md:py-6 flex gap-3 justify-end border-t border-[#e7eae9] bg-[#fafafa]">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="cursor-pointer border-[#e7eae9] text-[#6b7c7a] hover:text-[#152e2b] hover:border-[#152e2b] hover:bg-white rounded-[10px] h-auto py-3 px-6 font-medium text-[0.95rem]"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleCreate}
                    disabled={!canCreate}
                    className="cursor-pointer bg-[#05dc7f] hover:bg-[#03c56f] text-[#0f2f28] rounded-[10px] h-auto py-3 px-7 font-semibold text-[0.95rem] disabled:opacity-50"
                >
                    {isCreating ? "Criando..." : "Criar projeto"}
                </Button>
            </div>
        </div>
    );
}
