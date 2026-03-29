"use client";

import { useTransition, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/src/domains/user/actions/toggle-follow.action";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/src/i18n/client";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/src/providers/AuthModalContext";

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
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = Number(session?.user?.id);
  const { openLoginModal } = useAuthModal();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  // Sincroniza o estado local se o prop mudar (importante ao navegar entre páginas)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  if (currentUserId === targetUserId) return null;

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (sessionStatus !== "authenticated") {
      openLoginModal();
      return;
    }

    const previousState = isFollowing;
    const newState = !previousState;

    setIsFollowing(newState);

    startTransition(async () => {
      // Optimistic Update no Cache do React Query
      // Atualiza todas as queries de "users" (feed de pessoas)
      queryClient.setQueriesData({ queryKey: ["users"] }, (old: any) => {
        if (Array.isArray(old)) {
          return old.map((u: any) => (u.id === targetUserId ? { ...u, isFollowing: newState } : u));
        }
        if (old?.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((u: any) =>
              u.id === targetUserId ? { ...u, isFollowing: newState } : u
            ),
          };
        }
        return old;
      });

      // Atualiza o feed de projetos
      queryClient.setQueriesData({ queryKey: ["feed-projects"] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((p: any) =>
          p.ownerId === targetUserId ? { ...p, isFollowingOwner: newState } : p
        );
      });

      // Atualiza queries de "profile" (página de perfil)
      queryClient.setQueriesData({ queryKey: ["profile"] }, (old: any) => {
        if (!old || old.id !== targetUserId) return old;
        return {
          ...old,
          isFollowing: newState,
          followersCount: newState ? old.followersCount + 1 : old.followersCount - 1,
        };
      });

      const result = await toggleFollowAction(targetUserId);

      if (result.success) {
        // Sincroniza o servidor e invalida para garantir que os dados estão 100% corretos
        router.refresh();
        queryClient.invalidateQueries({ queryKey: ["followers"] });
        queryClient.invalidateQueries({ queryKey: ["following"] });
        queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
        queryClient.invalidateQueries({ queryKey: ["users"] }); // Re-validar usuários para garantir que todas as listas estão em dia
      } else {
        // Rollback em caso de erro
        setIsFollowing(previousState);

        // Mapeia erro em inglês para português
        let errorMessage = dict.profile.error_process;
        if (result.error === "You cannot follow yourself") {
          errorMessage = dict.profile.error_self_follow;
        } else if (result.error === "Unauthorized") {
          errorMessage = dict.auth.errors.unauthorized;
        }

        toast.error(errorMessage);

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
      variant={variant}
      className={cn(
        "transition-all duration-300 font-bold rounded-full cursor-pointer active:scale-95 px-6 shrink-0",
        // Overlay variant (for ProjectCard images, etc)
        variant === "ghost"
          ? !isFollowing
            ? "bg-primary text-primary-foreground hover:bg-white hover:text-primary border-none shadow-lg shadow-[0_4px_15px_rgba(5,220,127,0.3)]"
            : "bg-primary/10 backdrop-blur-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-none font-bold"
          : // Default brand styles
            !className?.includes("bg-") &&
              (!isFollowing
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                : "bg-transparent border border-primary text-primary hover:bg-primary/10 shadow-none font-bold"),
        className
      )}
    >
      {isPending ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isFollowing ? (
        <span className="flex items-center gap-1.5 leading-none">
          <Check size={14} className="stroke-[3]" />
          {dict.profile.unfollow}
        </span>
      ) : (
        dict.profile.follow
      )}
    </Button>
  );
}
