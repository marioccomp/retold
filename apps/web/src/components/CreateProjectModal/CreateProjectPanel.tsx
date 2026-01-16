"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiGithub } from "react-icons/fi";
import styles from "./CreateProjectPanel.module.css";
import {
    createProjectAction,
    getRepositoriesAction,
    verifyUserInstallation,
} from "@/src/domains/project/actions";
import { toast } from "sonner";

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
        <div className={styles.panel}>
            {/* Header */}
            <div className={styles.header}>
                <h2>Novo projeto</h2>
                <p className={styles.subtitle}>Preencha as informações do seu novo projeto</p>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Form Section */}
                <div className={styles.formSection}>
                    {/* Title */}
                    <div className={styles.field}>
                        <label htmlFor="project-title">Título</label>
                        <input
                            id="project-title"
                            type="text"
                            placeholder="Nome do seu projeto"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div className={styles.field}>
                        <label htmlFor="project-description">Descrição</label>
                        <textarea
                            id="project-description"
                            placeholder="Uma breve descrição do projeto"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={280}
                        />
                    </div>

                    {/* Visibility */}
                    <div className={styles.field}>
                        <label htmlFor="project-visibility">Visibilidade</label>
                        <select
                            id="project-visibility"
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                        >
                            <option value="public">Público</option>
                            <option value="private">Privado</option>
                        </select>
                    </div>
                </div>

                {/* Repositories Section */}
                <div className={styles.reposSection}>
                    <h3>Repositório</h3>
                    <p className={styles.reposSubtitle}>Selecione um repositório do GitHub</p>

                    {isLoadingRepos ? (
                        <div className={styles.loading}>Carregando repositórios...</div>
                    ) : repositories.length > 0 ? (
                        <div className={styles.reposList}>
                            {repositories.map((repo) => {
                                const isSelected = selectedRepoId === repo.id;
                                return (
                                    <div
                                        key={repo.id}
                                        className={`${styles.repoItem} ${isSelected ? styles.selected : ""}`}
                                        onClick={() => setSelectedRepoId(repo.id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === "Enter" && setSelectedRepoId(repo.id)}
                                    >
                                        <span className={styles.repoName}>
                                            <FiGithub style={{ marginRight: 8, verticalAlign: "middle" }} />
                                            {repo.name}
                                        </span>
                                        <span className={styles.selectIndicator}>
                                            {isSelected ? "✓ Selecionado" : ""}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyRepos}>
                            Nenhum repositório conectado ainda.
                        </div>
                    )}

                    <button className={styles.addReposButton} onClick={handleAddRepository}>
                        <FiPlus size={18} />
                        {repositories.length > 0 ? "Gerenciar repositórios" : "Conectar repositórios"}
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <button className={styles.cancelButton} onClick={onClose}>
                    Cancelar
                </button>
                <button
                    className={styles.createButton}
                    onClick={handleCreate}
                    disabled={!canCreate}
                >
                    {isCreating ? "Criando..." : "Criar projeto"}
                </button>
            </div>
        </div>
    );
}
