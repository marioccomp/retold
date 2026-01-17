"use client";

// import styles from "./ProjectCard.module.css";
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import { MdOutlineVisibility } from "react-icons/md";
import { FaGithub } from "react-icons/fa";
import imageProject from "@/assets/mockup-escalonador.jpg";
import { useState } from "react";
import ownerPic from "@/assets/foto.jpeg"; // Deve vir do banco
import { ProjectCardDTO } from "../domains/project/dtos/project-card.dto";
import { ProjectSettings } from "./ProjectPanel/components/ProjectSettings";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Props {
  project: ProjectCardDTO;
  onClick?: () => void;
  ownProfile?: boolean;
  disableHover?: boolean;
  disableConfig?: boolean;
}

export default function ProjectCard({ project, onClick, ownProfile, disableHover, disableConfig }: Props) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false); // Isso aqui tem q ser carregado baseado se o usuario curtiu ou nao

  const ownerName: string = project.ownerName || "Mario Junior";

  // Check if owner is current user
  const isOwner = ownProfile || (session?.user?.username === project.ownerUsername);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique no like propague para o card
    setIsLiked(!isLiked);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={`group flex flex-col w-full border border-[#f0f0f0] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden bg-white transition-transform duration-200 ease-in-out p-0 ${!disableHover ? 'hover:-translate-y-0.5' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="w-full h-[320px] min-[650px]:h-[260px] relative overflow-hidden">
        <img
          src={imageProject.src}
          alt="Imagem do projeto"
          className="w-full h-full object-cover block"
        />

        {/* Longer Description Overlay */}
        <div className="absolute left-0 w-full bg-[#152e2b]/95 text-white flex flex-col z-[2] transition-opacity duration-300
          max-[650px]:h-auto max-[650px]:max-h-[80%] max-[650px]:top-auto max-[650px]:bottom-0 max-[650px]:opacity-100 max-[650px]:p-5
          min-[650px]:top-0 min-[650px]:h-full min-[650px]:p-6 min-[650px]:opacity-0 min-[650px]:group-hover:opacity-100 box-border"
        >
          <div className="flex items-center gap-2.5 mb-3 max-[650px]:mb-2 max-[650px]:gap-2">
            <Avatar className="w-[35px] h-[35px] max-[650px]:w-[30px] max-[650px]:h-[30px]">
              <AvatarImage src={project.ownerImage || ownerPic.src} alt={ownerName} className="object-cover" />
              <AvatarFallback>{ownerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="max-[650px]:text-[0.9rem] max-[650px]:font-semibold">{ownerName}</p>
          </div>
          <div className="text-[15px] leading-relaxed text-[#f0fdf4] mb-3 line-clamp-[7] overflow-hidden text-ellipsis
            max-[650px]:text-[14px] max-[650px]:leading-snug max-[650px]:text-[#e2e8f0] max-[650px]:line-clamp-3"
          >
            <p>{project.description}</p>
          </div>
          <ul className="flex gap-1.5 list-none p-0 mt-auto flex-wrap max-h-[50px] overflow-hidden max-[650px]:gap-1.5">
            {project.tags.map((tag) => (
              <li key={tag.id}>
                <Badge
                  className="bg-[#05dc7f] text-[#152e2b] px-2.5 py-1 rounded text-[11px] font-bold max-[650px]:px-2.5 max-[650px]:py-[3px] max-[650px]:text-[10px] hover:bg-[#05dc7f]/80 border-none"
                >
                  {tag.name}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        {isOwner && !disableConfig && (
          <div className="absolute top-3 right-3 z-[10]">
            <ProjectSettings
              project={project}
              triggerClassName="p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full transition-all text-white shadow-lg border border-white/10 focus:outline-none outline-none focus-visible:ring-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col w-full max-[650px]:flex-row max-[650px]:items-start max-[650px]:justify-between max-[650px]:p-[16px_20px] max-[650px]:gap-2.5 max-[650px]:bg-white max-[380px]:p-[14px_12px]">
        <div className="p-[20px_24px_10px_24px] max-[650px]:p-0 max-[650px]:flex-1 max-[650px]:min-w-0 max-[650px]:mr-3">
          <h3 className="text-[18px] font-bold text-[#1a202c] m-0 line-clamp-2 overflow-hidden text-ellipsis whitespace-normal
            max-[650px]:text-[1.1rem] max-[650px]:whitespace-normal max-[650px]:max-w-full max-[380px]:text-[0.95rem]"
          >
            {project.title}
          </h3>
          <p className="text-[#718096] text-[14px] mt-1 max-[650px]:hidden">
            {project.description && project.description.length > 80
              ? `${project.description.slice(0, 80)}...`
              : project.description}
          </p>
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 max-[650px]:hidden">
              {project.tags.slice(0, 4).map((tag) => (
                <Badge key={tag.id} className="bg-[#05dc7f]/12 text-[#047857] px-2 py-[3px] rounded text-[11px] font-semibold hover:bg-[#05dc7f]/20 border-none shadow-none">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex p-[10px_24px_20px_24px] gap-4 justify-end text-[#4a5568]
          max-[650px]:p-0 max-[650px]:gap-3 max-[650px]:shrink-0 max-[380px]:gap-2"
        >
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2 cursor-pointer text-inherit no-underline"
              onClick={(e) => e.stopPropagation()}
              title={project.repositoryFullName || "View Code"}
            >
              <FaGithub size={20} />
            </a>
          )}

          <div
            onClick={handleToggleLike}
            className="flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2 cursor-pointer select-none transition-transform duration-100 active:scale-90 group/like"
          >
            {isLiked ? (
              <MdFavorite className="text-[#ff4d4d] animate-[heartPop_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]" size={22} />
            ) : (
              <MdFavoriteBorder className="text-[#4a5568] transition-colors duration-200 group-hover/like:text-[#ff4d4d]" size={22} />
            )}
            <p className={`transition-colors duration-200 ${isLiked ? 'text-[#ff4d4d] font-semibold' : ''}`}>{project.likes}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[14px] max-[650px]:text-[16px] max-[650px]:gap-2">
            <MdOutlineVisibility size={22} />
            <p>{project.views}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
