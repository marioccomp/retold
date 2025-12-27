"use client";

import Image from "next/image";
import logo from "@/assets/image 15.png";
import profilePic from "@/assets/foto.jpeg";
import styles from "./Header.module.css";
import { FaRegUser } from "react-icons/fa";
import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  let userImage: string | null = profilePic.src; // Aqui to pegando a imagem da pasta msm, dps so descomentar a linha de baixo que pega do banco
  const userName = session?.user?.name;
  // const userImage = session?.user?.image;

  return (
    <header className={`${styles.header}`}>
      <div className={styles.container}>
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
          {status === "authenticated" ? (
            <div className={styles.profileImgWrapper}>
              {userImage ? (
                <Image
                  src={userImage}
                  alt={`Foto de ${userName}`}
                  width={40}
                  height={40}
                  className={styles.profileImg}
                />
              ) : (
                <div className={styles.iconFallback}>
                  <FaRegUser />
                </div>
              )}
            </div>
          ) : (
            <button className={styles.loginButton}>Entrar</button>
          )}
        </div>
      </div>
    </header>
  );
}
