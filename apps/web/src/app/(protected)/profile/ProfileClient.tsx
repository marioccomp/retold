"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./profile.module.css";
import capa from "@/assets/capa.jpg";
import ownerPic from "@/assets/foto.jpeg";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";

import ProjectsSection from "./ProjectsSection";
import CertificationsSection from "./CertificationsSection";
import ParticipationsSection from "./ParticipationsSection";

export default function ProfileClient() {
  const [selected, setSelected] = useState("Projetos");
  const tabs = ["Projetos", "Certificações", "Participações"];
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className={styles.main}>
      <section className={styles.header}>
        <Image src={capa} className={styles.banner} alt="Capa do perfil" priority />
      </section>

      <div className={styles.layout}>
        <aside className={styles.profileAside}>
          <div className={styles.avatarWrapper}>
            <Image src={ownerPic} className={styles.avatar} alt="Foto de perfil" priority />
            <div className={styles.ownerName}>Mario Junior</div>
          </div>

          <section className={styles.profileDetails}>
            <div className={styles.title}>
              <h3>Desenvolvedor Full Stack</h3>
            </div>

            <div className={styles.description}>
              <p>
                Apaixonado por criar soluções web robustas e escaláveis. Especialista em Node.js,
                React e arquitetura de software. Focado em construir produtos que impactam
              </p>
            </div>

            <ul className={styles.social}>
              <li>
                <FiGithub />
              </li>
              <li>
                <FiLinkedin />
              </li>
              <li>
                <FaGoogle />
              </li>
            </ul>

            <div className={styles.stats}>
              <p>
                <span>12.5k</span> views
              </p>
              <p>
                <span>482</span> likes
              </p>
            </div>

            <button>Contatar</button>
          </section>
        </aside>

        <main className={styles.content}>
          <div className={styles.contentHeader}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelected(tab);
                  setSearchQuery("");
                }}
                className={selected === tab ? styles.selected : ""}
              >
                {tab}
              </button>
            ))}
            <input
              type="text"
              placeholder={`Pesquisar em ${selected.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.projectsGrid}>
            {selected === "Projetos" && <ProjectsSection searchQuery={searchQuery} />}
            {selected === "Certificações" && <CertificationsSection searchQuery={searchQuery} />}
            {selected === "Participações" && <ParticipationsSection searchQuery={searchQuery} />}
          </div>
        </main>
      </div>
    </div>
  );
}
