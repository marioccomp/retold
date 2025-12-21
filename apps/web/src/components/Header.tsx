import Image from "next/image";
import logo from "@/assets/image 15.png";
import profilePic from "@/assets/foto.jpeg";
import styles from "./Header.module.css";
import { auth } from "@/src/auth";
import { FaRegUser } from "react-icons/fa";

export default async function Header() {
  const session = await auth();
  // const userImage = session?.user?.image;
  const userImage = profilePic.src;
  const userName = session?.user?.name;

  console.log(session);
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
