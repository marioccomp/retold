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
}

export default function ProjectCard({ project }: Props) {
  const [isLiked, setIsLiked] = useState(false); // Isso aqui tem q ser carregado baseado se o usuario curtiu ou nao

  // const project = {
  //   title: "Simulador de Escalonamento",
  //   description: "Comparativo de desempenho entre algoritmos de CPU",
  //   longerDescription:
  //     "Sistema completo de adoção de animais. A API gerencia usuários, autenticação JWT, perfis de ONGs, processamento de imagens e chat em tempo real via WebSockets. ",
  //   projectPic: "@/assets/mockup-escalonador.jpg", // pesquisar dps como armazenar imagens e buscar elas no banco
  //   ownerId: 123,
  //   mainTags: ["Julia", "Data Structures"],
  //   likes: 102,
  //   views: 127,
  // };

  const ownerName: string = "Mario Junior";

  const handleToggleLike = () => {
    setIsLiked(!isLiked);
  };

  return (
    <section className={styles.card}>
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
