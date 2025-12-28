"use client";

import Image from "next/image";
import styles from "./participations.module.css";
import { FiPlus } from "react-icons/fi";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  searchQuery: string;
};

export default function ParticipationsSection({ searchQuery, ownProfile, profile }: Props) {
  const FALLBACK_EVENT =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop";

  const participations = [
    {
      id: 1,
      event: "JuliaCon 2024",
      role: "Palestrante",
      description: "Apresentação sobre simulações físicas em tempo real.",
      date: "Jul 2024",
      image: null,
    },
    {
      id: 2,
      event: "Hackathon Global",
      role: "Finalista",
      description: "Desenvolvimento de solução para cidades inteligentes.",
      date: "Mai 2023",
      image: null,
    },
  ];

  const filtered = participations.filter(
    (part) =>
      part.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewParticipation = () => {
    console.log("Abrir modal de nova participação");
  };

  return (
    <>
      {/* Card de adicionar nova participação */}
      {ownProfile && searchQuery === "" && (
        <div className={styles.newCard} onClick={handleNewParticipation} role="button" tabIndex={0}>
          <FiPlus className={styles.newIcon} />
          <span className={styles.newText}>Nova participação</span>
        </div>
      )}

      {filtered.map((part) => (
        <div key={part.id} className={styles.genericCard}>
          <div className={styles.cardImageWrapper}>
            <Image
              src={part.image || FALLBACK_EVENT}
              alt={part.event}
              fill
              className={styles.cardImage}
              unoptimized
            />
            <span className={styles.badge}>{part.role}</span>
          </div>
          <div className={styles.genericCardContent}>
            <div className={styles.cardInfo}>
              <h4>{part.event}</h4>
              <p className={styles.partDescription}>{part.description}</p>
              <small>{part.date}</small>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
