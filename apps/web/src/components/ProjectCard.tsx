"use client";

// import styles from "./ProjectCard.module.css";
import { MdFavoriteBorder, MdFavorite, MdOutlineVisibility, MdModeComment } from "react-icons/md";
import { FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { ExternalLink, Lock, MessageCircle } from "lucide-react";
import placeholderImage from "@/assets/mockup-escalonador.jpg";
import { useState, useEffect, useTransition } from "react";
import ownerPic from "@/assets/foto.jpeg";
import { ProjectCardDTO } from "../domains/project/dtos/project-card.dto";
import { ProjectSettings } from "./ProjectPanel/components/ProjectSettings";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import emptyImage from "@/assets/empty_file.png";
import { toggleLike } from "../domains/project/actions/toggle-like.action";
import { useTranslation } from "@/src/i18n/client";
import { FiLoader } from "react-icons/fi";
import { FollowButton } from "./FollowButton";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthModal } from "@/src/providers/AuthModalContext";
import Link from "next/link";

interface Props {
  project: ProjectCardDTO;
  onClick?: () => void;
  ownProfile?: boolean;
  disableHover?: boolean;
  disableConfig?: boolean;
}

export default function ProjectCard({
  project,
  onClick,
  ownProfile,
  disableHover,
  disableConfig,
}: Props) {
  const { data: session } = useSession();
  const { dict } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const queryClient = useQueryClient(); // Access React Query Client
  const [isLiked, setIsLiked] = useState(project.hasLiked ?? false);
  const [likesCount, setLikesCount] = useState(project.likes);
  const [viewsCount, setViewsCount] = useState(project.views);
  const [animateLike, setAnimateLike] = useState(false);

  // Sincroniza se o prop mudar (importante para refreshes do Next.js)
  useEffect(() => {
    setViewsCount(project.views);
    setIsLiked(project.hasLiked ?? false);
    setLikesCount(project.likes);
  }, [project.views, project.likes, project.hasLiked]);

  const ownerName: string = project.ownerName || "Mario Junior";

  // Check if owner is current user
  const isOwner = ownProfile || session?.user?.username === project.ownerUsername;

  const { openLoginModal } = useAuthModal();

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.user) {
      openLoginModal();
      return;
    }

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setAnimateLike(true);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    startTransition(async () => {
      const response = await toggleLike(project.id);
      if (response.success) {
        // Sync other components (like FeedProjectsGrid) by validating specific query keys
        queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
        queryClient.invalidateQueries({ queryKey: ["highlighted-project"] });
      } else {
        // Rollback se falhar
        setIsLiked(!newIsLiked);
        setLikesCount((prev) => (!newIsLiked ? prev + 1 : prev - 1));
      }
    });
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={`group flex flex-col w-full border border-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden bg-card transition-transform duration-200 ease-in-out p-0 ${!disableHover ? "hover:-translate-y-0.5" : ""}`}
      onClick={handleCardClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="w-full h-[320px] min-[650px]:h-[260px] relative overflow-hidden">
        <img
          src={project.images?.[0] || emptyImage.src}
          alt="Imagem do projeto"
          className="w-full h-full object-cover block"
        />

        {/* Longer Description Overlay */}
        <div
          className="absolute inset-0 bg-neutral-950/90 dark:bg-card/95 text-white flex flex-col z-[2] transition-opacity duration-300
          max-[650px]:h-auto max-[650px]:max-h-[80%] max-[650px]:top-auto max-[650px]:bottom-0 max-[650px]:opacity-100 max-[650px]:p-5
          min-[650px]:top-0 min-[650px]:h-full min-[650px]:p-6 min-[650px]:opacity-0 min-[650px]:group-hover:opacity-100 box-border border-b border-border/10"
        >
          <div className="flex items-center gap-2.5 mb-3 max-[650px]:mb-2 max-[650px]:gap-2">
            <Link
              href={`/${project.ownerUsername}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="flex items-center gap-2.5 group/creator cursor-pointer"
            >
              <Avatar className="w-[35px] h-[35px] max-[650px]:w-[30px] max-[650px]:h-[30px] border border-white/20 dark:border-primary/20 transition-all duration-200 group-hover/creator:border-primary/50 group-hover/creator:scale-105">
                <AvatarImage
                  src={project.ownerImage || undefined}
                  alt={ownerName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs uppercase">
                  {ownerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-white dark:text-foreground max-[650px]:text-[0.9rem] max-[650px]:font-semibold group-hover/creator:text-primary transition-colors duration-200">
                {ownerName}
              </p>
            </Link>
            {!isOwner && project.ownerId && (
              <FollowButton
                targetUserId={project.ownerId}
                initialIsFollowing={project.isFollowingOwner ?? false}
                variant="ghost"
                className="h-8 px-4 text-[11px] font-bold uppercase tracking-[0.1em] active:scale-95 transition-all"
              />
            )}
          </div>
          <div
            className="text-[15px] leading-relaxed text-white/70 dark:text-muted-foreground mb-3 line-clamp-[7] overflow-hidden text-ellipsis break-words
            max-[650px]:text-[14px] max-[650px]:leading-snug max-[650px]:line-clamp-3"
          >
            <p className="whitespace-pre-wrap">{project.description}</p>
          </div>
        </div>

        {isOwner && !disableConfig && (
          <div className="absolute top-3 right-3 z-[10]">
            <ProjectSettings
              project={project}
              triggerClassName="p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full transition-all text-white shadow-lg border border-white/10 focus:outline-none outline-none focus-visible:ring-0 cursor-pointer"
            />
          </div>
        )}

        {/* Analyzing Overlay */}
        {(project.status === "PENDING" || project.status === "ANALYZING") && (
          <div className="absolute inset-0 bg-black/60 z-[20] flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
            <div className="animate-spin mb-3">
              <FiLoader size={28} className="text-primary" />
            </div>
            <p className="font-semibold text-sm tracking-wide">
              {dict.project.status.ANALYZING}...
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col w-full max-[650px]:flex-row max-[650px]:items-start max-[650px]:justify-between max-[650px]:p-[16px_20px] max-[650px]:gap-2.5 max-[650px]:bg-card max-[380px]:p-[14px_12px]">
        <div className="p-[20px_24px_10px_24px] max-[650px]:p-0 max-[650px]:flex-1 max-[650px]:min-w-0 max-[650px]:mr-3">
          <div className="flex items-center gap-2">
            <h3
              className="text-[18px] font-bold text-foreground m-0 line-clamp-2 overflow-hidden text-ellipsis whitespace-normal
              max-[650px]:text-[1.1rem] max-[650px]:whitespace-normal max-[650px]:max-w-full max-[380px]:text-[0.95rem]"
            >
              {project.title}
            </h3>
            {isOwner && project.visibility === "private" && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-full shrink-0"
                title={dict.project.create_panel.visibility_options.private}
              >
                <Lock size={12} className="text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">
                  {dict.project.create_panel.visibility_options.private}
                </span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-[14px] mt-1 max-[650px]:hidden break-words whitespace-pre-wrap">
            {project.description && project.description.length > 80
              ? `${project.description.slice(0, 80)}...`
              : project.description}
          </p>
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.tags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="px-2 py-[3px] rounded text-[11px] font-semibold border-none shadow-none"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex p-[10px_24px_20px_24px] gap-4 justify-end text-muted-foreground
          max-[650px]:p-0 max-[650px]:gap-3 max-[650px]:shrink-0 max-[380px]:gap-2"
        >
          {project.repositoryUrl && !project.repositoryIsPrivate && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2 cursor-pointer text-muted-foreground hover:text-primary transition-colors no-underline"
              onClick={(e) => e.stopPropagation()}
              title={project.repositoryFullName || "View Code"}
            >
              <FaGithub size={20} />
            </a>
          )}

          <div
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2 cursor-pointer select-none transition-transform duration-100 active:scale-90 group/like ${isPending ? "opacity-70 pointer-events-none" : ""}`}
          >
            {isLiked ? (
              <MdFavorite
                className={`text-[#ff4d4d] ${animateLike ? "animate-[heartPop_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]" : ""}`}
                size={22}
                onAnimationEnd={() => setAnimateLike(false)}
              />
            ) : (
              <MdFavoriteBorder
                className="text-muted-foreground transition-colors duration-200 group-hover/like:text-[#ff4d4d]"
                size={22}
              />
            )}
            <p
              className={`transition-colors duration-200 ${isLiked ? "text-[#ff4d4d] font-semibold" : ""}`}
            >
              {likesCount}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2">
            <MessageCircle size={18} className="text-muted-foreground/80 -translate-y-[1px]" />
            <p>{project.commentsCount}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2">
            <MdOutlineVisibility size={22} />
            <p>{viewsCount}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
