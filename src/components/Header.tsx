import logo from "@/assets/image 15.png";
import profilePic from "@/assets/foto.jpeg";
import styles from "./Header.module.css";
import { Questrial } from "next/font/google";

// Fonte Questrial
const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

export default function Header() {
  return (
    <header className={`${styles.header} ${questrial.variable}`}>
      <div className={styles.logoWithBtn}>
        <div className={styles.logo}>
          <img src={logo.src} alt="" />
        </div>
        <ul className={styles.headerBtn}>
          <li>Explorar</li>
          <li>Vagas</li>
          <li>Sobre</li>
        </ul>
      </div>
      <div className={styles.profile}>
        <p className={styles.name}>Mario Junior</p>
        <img src={profilePic.src} alt="" />
      </div>
    </header>
  );
}
