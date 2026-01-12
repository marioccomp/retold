"use client";

import styles from "./ProjectCard.module.css";
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import { MdOutlineVisibility } from "react-icons/md";
import imageProject from "@/assets/mockup-escalonador.jpg";
import { useState } from "react";
import ownerPic from "@/assets/foto.jpeg"; // Deve vir do banco
import { ProjectCardDTO } from "../domains/profile/dtos/project-card.dto";

interface Props {
  project: ProjectCardDTO;
  onClick?: () => void;
}

export default function ProjectCard({ project, onClick }: Props) {
  const [isLiked, setIsLiked] = useState(false); // Isso aqui tem q ser carregado baseado se o usuario curtiu ou nao

  const ownerName: string = "Mario Junior";

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
            <img src={ownerPic.src} alt="Dono" />
            <p>{ownerName}</p>
          </div>
          <div className={styles.text}>
            <p>{project.longerDescription}</p>
          </div>
          <ul className={styles.tags}>
            {project.tags.map((tag) => (
              <li key={tag.id}>{tag.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.footerWrapper}>
        <div className={styles.projectText}>
          <h3 className={styles.title}>{project.title}</h3>
          <p className={styles.description}>{project.description}</p>
        </div>

        <div className={styles.stats}>
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
