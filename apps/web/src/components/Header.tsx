"use client";

import Image from "next/image";
import logo from "@/assets/image 15.png";
import profilePic from "@/assets/foto.jpeg";
import styles from "./Header.module.css";
import { FaRegUser } from "react-icons/fa";
import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  const userImage = profilePic.src; // Aqui to pegando a imagem da pasta msm, dps so descomentar a linha de baixo que pega do banco
  const userName = session?.user?.name;
  // const userImage = session?.user?.image;

  return (
    <header className={`${styles.header}`}>
      <div className={styles.logoContainer}>
        <Image src={logo} alt="Logo" className={styles.logoImg} priority />
      </div>

      <nav className={styles.navContainer}>
        <ul className={styles.headerBtn}>
          <li>Explorar</li>
          <li>Sobre</li>
        </ul>
      </nav>

      <div className={styles.profileContainer}>
        <p className={styles.name}>{userName || "Convidado"}</p>
        <div className={styles.profileImgWrapper}>
          {userImage ? (
            <Image
              src={userImage}
              alt={`Foto de ${userName}`}
              width={45}
              height={45}
              className={styles.profileImg}
            />
          ) : (
            <div className={styles.iconFallback}>
              <FaRegUser />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
