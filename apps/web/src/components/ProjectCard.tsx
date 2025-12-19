"use client";

import styles from "./ProjectCard.module.css";
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import { MdOutlineVisibility } from "react-icons/md";
import imageProject from "@/assets/mockup-escalonador.jpg";
import { useState } from "react";
import ownerPic from "@/assets/foto.jpeg"; // Deve vir do banco

export default function ProjectCard() {
  const [isLiked, setIsLiked] = useState(false); // Isso aqui tem q ser carregado baseado se o usuario curtiu ou nao

  const project = {
    title: "Simulador de Escalonamento",
    description: "Comparativo de desempenho entre algoritmos de CPU",
    longerDescription:
      "Ferramenta educacional para SO. Implementa algoritmos FIFO, SJF e Round Robin, gerando gráficos Gantt.",
    projectPic: "@/assets/mockup-escalonador.jpg", // pesquisar dps como armazenar imagens e buscar elas no banco
    ownerId: 123,
    mainTags: ["Julia", "Data Structures"],
    likes: 102,
    views: 127,
  };

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
            <img src={ownerPic.src} alt="Foto do dono do projeto" />
            <p>{ownerName}</p> {/* Deve vir do banco o nome */}
          </div>
          <div className={styles.text}>
            <p>{project.longerDescription}</p>
          </div>
          <ul className={styles.tags}>
            {" "}
            {/* Deve vir do banco as tags */}
            {project.mainTags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.projectText}>
        <h3 className={styles.title}>{project.title}</h3>
        <p className={styles.description}>{project.description}</p>
      </div>
      <div className={styles.stats}>
        <div className={styles.likes}>
          {isLiked ? (
            <MdFavorite
              onClick={handleToggleLike}
              className={`${styles.like} ${styles.likedAnimation}`}
              size={24}
            />
          ) : (
            <MdFavoriteBorder onClick={handleToggleLike} className={styles.like} size={24} />
          )}
          <p>{project.likes}</p>
        </div>
        <div className={styles.views}>
          <MdOutlineVisibility size={24} />
          <p>{project.views}</p>
        </div>
      </div>
    </section>
  );
}
