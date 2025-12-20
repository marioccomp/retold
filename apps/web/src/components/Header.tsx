import Image from "next/image";
import logo from "@/assets/image 15.png";
import profilePic from "@/assets/foto.jpeg";
import styles from "./Header.module.css";
import { Questrial } from "next/font/google";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

export default function Header() {
  return (
    <header className={`${styles.header} ${questrial.variable}`}>
      <div className={styles.logoContainer}>
        <img src={logo.src} alt="Logo" className={styles.logoImg} />
      </div>

      <nav className={styles.navContainer}>
        <ul className={styles.headerBtn}>
          <li>Explorar</li>
          <li>Sobre</li>
        </ul>
      </nav>

      <div className={styles.profileContainer}>
        <p className={styles.name}>Mario Junior</p>
        <div className={styles.profileImgWrapper}>
          <img src={profilePic.src} alt="Profile" />
        </div>
      </div>
    </header>
  );
}
