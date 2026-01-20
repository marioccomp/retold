"use client";

import { useTransition, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/src/domains/user/actions/toggle-follow.action";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/src/i18n/client";

interface FollowButtonProps {
    targetUserId: number;
    initialIsFollowing: boolean;
    className?: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
}

export function FollowButton({
    targetUserId,
    initialIsFollowing,
    className,
    variant = "default",
    size = "default",
}: FollowButtonProps) {
    const { dict } = useTranslation();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

    // Sincroniza o estado local se o prop mudar (importante ao navegar entre páginas)
    useEffect(() => {
        setIsFollowing(initialIsFollowing);
    }, [initialIsFollowing]);

    const handleToggleFollow = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const previousState = isFollowing;
        const newState = !previousState;

        setIsFollowing(newState);

        startTransition(async () => {
            // Optimistic Update no Cache do React Query
            // Atualiza todas as queries de "users" (feed de pessoas)
            queryClient.setQueriesData({ queryKey: ["users"] }, (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((u: any) =>
                        u.id === targetUserId ? { ...u, isFollowing: newState } : u
                    )
                };
            });

            // Atualiza queries de "profile" (página de perfil)
            queryClient.setQueriesData({ queryKey: ["profile"] }, (old: any) => {
                if (!old || old.id !== targetUserId) return old;
                return {
                    ...old,
                    isFollowing: newState,
                    followersCount: newState ? (old.followersCount + 1) : (old.followersCount - 1)
                };
            });

            const result = await toggleFollowAction(targetUserId);

            if (result.success) {
                // Sincroniza o servidor e invalida para garantir que os dados estão 100% corretos
                router.refresh();
                queryClient.invalidateQueries({ queryKey: ["followers"] });
                queryClient.invalidateQueries({ queryKey: ["following"] });
            } else {
                // Rollback em caso de erro
                setIsFollowing(previousState);
                toast.error(result.error || "Failed to process request");

                // Reverte o cache
                queryClient.invalidateQueries({ queryKey: ["users"] });
                queryClient.invalidateQueries({ queryKey: ["profile"] });
            }
        });
    };

    return (
        <Button
            onClick={handleToggleFollow}
            disabled={isPending}
            size={size}
            className={cn(
                "transition-all duration-300 font-bold rounded-full cursor-pointer active:scale-95 px-6 shrink-0",
                !isFollowing ? (
                    "bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] border-none shadow-[0_4px_12px_rgba(5,220,127,0.2)] hover:shadow-[0_6px_16px_rgba(5,220,127,0.3)]"
                ) : (
                    "bg-transparent border-2 border-[#05dc7f] text-[#05dc7f] hover:bg-[#05dc7f]/10 shadow-none"
                ),
                className
            )}
        >
            {isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                isFollowing ? dict.profile.unfollow : dict.profile.follow
            )}
        </Button>
    );
}
