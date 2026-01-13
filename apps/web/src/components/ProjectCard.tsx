"use client";

import styles from "./ProjectCard.module.css";
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import { MdOutlineVisibility } from "react-icons/md";
import { FaGithub } from "react-icons/fa";
import imageProject from "@/assets/mockup-escalonador.jpg";
import { useState } from "react";
import ownerPic from "@/assets/foto.jpeg"; // Deve vir do banco
import { ProjectCardDTO } from "../domains/profile/dtos/project-card.dto";
import { ProjectSettings } from "./ProjectOverlay/components/ProjectSettings";
import { useSession } from "next-auth/react";

interface Props {
  project: ProjectCardDTO;
  onClick?: () => void;
  ownProfile?: boolean;
}

export default function ProjectCard({ project, onClick, ownProfile }: Props) {
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
    <section
      className={styles.card}
      onClick={handleCardClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className={styles.img}>
        <img src={imageProject.src} alt="Imagem do projeto" />

        <div className={styles.longerDescription}>
          <div className={styles.owner}>
            <img src={project.ownerImage || ownerPic.src} alt="Dono" />
            <p>{ownerName}</p>
          </div>
          <div className={styles.text}>
            <p>{project.description}</p>
          </div>
          <ul className={styles.tags}>
            {project.tags.map((tag) => (
              <li key={tag.id}>{tag.name}</li>
            ))}
          </ul>
        </div>

        {isOwner && (
          <div className="absolute top-3 right-3 z-[10]">
            <ProjectSettings
              project={project}
              triggerClassName="p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full transition-all text-white shadow-lg border border-white/10 focus:outline-none outline-none focus-visible:ring-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className={styles.footerWrapper}>
        <div className={styles.projectText}>
          <h3 className={styles.title}>{project.title}</h3>
          <p className={styles.description}>
            {project.description && project.description.length > 80
              ? `${project.description.slice(0, 80)}...`
              : project.description}
          </p>
          {project.tags.length > 0 && (
            <div className={styles.footerTags}>
              {project.tags.slice(0, 4).map((tag) => (
                <span key={tag.id} className={styles.footerTag}>{tag.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.stats}>
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.views}
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}
              title={project.repositoryFullName || "View Code"}
            >
              <FaGithub size={20} />
            </a>
          )}

          <div onClick={handleToggleLike} className={styles.likes}>
            {isLiked ? (
              <MdFavorite className={styles.likedAnimation} size={22} />
            ) : (
              <MdFavoriteBorder size={22} />
            )}
            <p>{project.likes}</p>
          </div>
          <div className={styles.views}>
            <MdOutlineVisibility size={22} />
            <p>{project.views}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
