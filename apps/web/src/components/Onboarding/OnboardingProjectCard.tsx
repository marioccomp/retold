"use client";

import { MdFavoriteBorder, MdFavorite, MdOutlineVisibility } from "react-icons/md";
import { FaGithub } from "react-icons/fa";
import { MessageCircle } from "lucide-react";
import emptyImage from "@/assets/empty_file.png";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { capitalizeSkill, getProjectCardTags } from "@/lib/utils";

interface Props {
  project: ProjectCardDTO;
}

export default function OnboardingProjectCard({ project }: Props) {
  const ownerName = project.ownerName || "Mario Junior";

  return (
    <Card
      className="group flex flex-col w-full border border-border rounded-lg shadow-sm overflow-hidden bg-card transition-transform duration-200 ease-in-out p-0"
    >
      <div className="w-full h-[140px] max-[650px]:h-[220px] relative overflow-hidden bg-muted">
        <img
          src={project.images?.[0] || emptyImage.src}
          alt="Imagem do projeto"
          className="w-full h-full object-cover block"
        />

        {/* Overlay - appears only on mobile or Desktop hover (we only care about mobile logic here) */}
        <div
          className="absolute inset-0 bg-neutral-950/90 dark:bg-card/95 text-white flex flex-col z-[2] transition-opacity duration-300
          max-[650px]:h-auto max-[650px]:top-auto max-[650px]:bottom-0 max-[650px]:opacity-100 max-[650px]:p-[10px_14px]
          min-[650px]:top-0 min-[650px]:h-full min-[650px]:opacity-0 min-[650px]:p-0 pointer-events-none box-border border-b border-border/10"
        >
          <div className="flex items-center gap-2 mb-1 hidden max-[650px]:flex">
            <Avatar className="w-[20px] h-[20px] border border-white/20 dark:border-primary/20">
              <AvatarImage
                src={project.ownerImage || undefined}
                alt={ownerName}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-[8px] uppercase">
                {ownerName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-white dark:text-foreground text-[0.75rem] font-semibold">
              {ownerName}
            </p>
          </div>
          <div
            className="text-[11px] leading-snug text-white/70 dark:text-muted-foreground line-clamp-1 overflow-hidden text-ellipsis break-words hidden max-[650px]:block"
          >
            <p className="whitespace-pre-wrap">{project.description}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full p-4 gap-3 max-[650px]:flex-row max-[650px]:items-start max-[650px]:justify-between max-[650px]:p-[14px_16px] max-[650px]:gap-2.5">
        <div className="max-[650px]:flex-1 max-[650px]:min-w-0">
          <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1 max-[650px]:text-[1rem] max-[650px]:mb-0 max-[650px]:whitespace-normal max-[650px]:line-clamp-2">
            {project.title}
          </h3>
          <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed max-[650px]:hidden">
            {project.description}
          </p>
          
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5 max-[650px]:mt-2">
              {getProjectCardTags(project.tags, project.featuredTagIds, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="px-1.5 py-[1px] rounded-[4px] text-[9px] font-semibold border-none shadow-none"
                >
                  {capitalizeSkill(tag.name)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 justify-end text-muted-foreground pt-1 max-[650px]:pt-0 max-[650px]:gap-2.5">
          {project.repositoryUrl && !project.repositoryIsPrivate && (
            <div className="flex items-center text-[12px] opacity-70">
              <FaGithub size={13} className="max-[650px]:w-[16px] max-[650px]:h-[16px]" />
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] opacity-80 max-[650px]:text-[13px]">
            {project.hasLiked ? (
              <MdFavorite className="text-[#ff4d4d] max-[650px]:w-[18px] max-[650px]:h-[18px]" size={14} />
            ) : (
              <MdFavoriteBorder size={14} className="max-[650px]:w-[18px] max-[650px]:h-[18px]" />
            )}
            <p className={project.hasLiked ? "text-[#ff4d4d] font-semibold" : ""}>
              {project.likes}
            </p>
          </div>
          
          <div className="flex items-center gap-1 text-[11px] opacity-80 max-[650px]:text-[13px]">
            <MessageCircle size={12} className="-translate-y-[0.5px] max-[650px]:w-[15px] max-[650px]:h-[15px]" />
            <p>{project.commentsCount}</p>
          </div>
          
          <div className="flex items-center gap-1 text-[11px] opacity-80 max-[650px]:text-[13px]">
            <MdOutlineVisibility size={14} className="max-[650px]:w-[18px] max-[650px]:h-[18px]" />
            <p>{project.views}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
