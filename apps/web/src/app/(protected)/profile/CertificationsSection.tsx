"use client";

import Image from "next/image";
import styles from "./certifications.module.css";
import { FiExternalLink, FiPlus } from "react-icons/fi";

export default function CertificationsSection({ searchQuery }: { searchQuery: string }) {
  const FALLBACK_CERT =
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop";

  const certifications = [
    {
      id: 1,
      title: "Full Stack Developer",
      issuer: "Rocketseat",
      date: "2024",
      link: "#",
      image: null,
    },
    {
      id: 2,
      title: "Data Structures in Julia",
      issuer: "MIT OpenCourseWare",
      date: "2023",
      link: "#",
      image: null,
    },
    {
      id: 3,
      title: "Advanced React Patterns",
      issuer: "Frontend Masters",
      date: "2024",
      link: "#",
      image: null,
    },
  ];

  const filtered = certifications.filter(
    (cert) =>
      cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewCertification = () => {
    console.log("Abrir modal de nova certificação");
  };

  return (
    <>
      {/* Card de adicionar nova certificação */}
      {searchQuery === "" && (
        <div className={styles.newCard} onClick={handleNewCertification} role="button" tabIndex={0}>
          <FiPlus className={styles.newIcon} />
          <span className={styles.newText}>Nova certificação</span>
        </div>
      )}

      {filtered.map((cert) => (
        <div key={cert.id} className={styles.genericCard}>
          <div className={styles.cardImageWrapper}>
            <Image
              src={cert.image || FALLBACK_CERT}
              alt={cert.title}
              fill
              className={styles.cardImage}
              unoptimized
            />
          </div>
          <div className={styles.genericCardContent}>
            <div className={styles.cardInfo}>
              <h4>{cert.title}</h4>
              <p>
                {cert.issuer} • {cert.date}
              </p>
            </div>
            <a href={cert.link} className={styles.cardLink} target="_blank">
              <FiExternalLink />
            </a>
          </div>
        </div>
      ))}
    </>
  );
}
