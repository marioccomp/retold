"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./profile.module.css";
import capa from "@/assets/capa.jpg";
import ownerPic from "@/assets/foto.jpeg";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { FiEdit2, FiCamera } from "react-icons/fi";
import { changeBio, changeName, changeTitle } from "../_actions/edit-profle";
import { toast } from "sonner";

import ProjectsSection from "./ProjectsSection";
import CertificationsSection from "./CertificationsSection";
import ParticipationsSection from "./ParticipationsSection";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
};

export default function ProfileClient({ profile, ownProfile }: Props) {
  const [selected, setSelected] = useState("Projetos");
  const tabs = ["Projetos", "Certificações", "Participações"];
  const [searchQuery, setSearchQuery] = useState("");

  // Apaixonado por criar soluções web robustas e escaláveis. Especialista em Node.js,
  // React e arquitetura de software. Focado em construir produtos que impactam

  const username = profile.name;
  const userImage = profile.image;
  const userBio = profile.bio;
  const userProjects = profile.projects;
  const userTitle = profile.title;

  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const [name, setName] = useState(profile.name ?? "");
  const [nameDraft, setNameDraft] = useState(profile.name ?? "");

  const [bio, setBio] = useState(profile.bio ?? "");
  const [bioDraft, setBioDraft] = useState(profile.bio ?? "");

  const [title, setTitle] = useState(profile.title ?? "");
  const [titleDraft, setTitleDraft] = useState(profile.title ?? "");

  const submitName = async () => {
    if (name === nameDraft) return;
    const result = await changeName(nameDraft, profile.id);

    if (result.success && result.data) {
      setEditingName(false);
      setName(result.data);
      setNameDraft(result.data);
      toast.success("Name changed successfully");
      return;
    }

    if (result.success === false) {
      setNameDraft(name);
      toast.error(result.message);
      setEditingName(false);
    }
  };

  const submitTitle = async () => {
    if (title === titleDraft) return;
    const result = await changeTitle(titleDraft, profile.id);

    if (result.success && result.data) {
      setEditingTitle(false);
      setTitle(result.data);
      setTitleDraft(result.data);
      toast.success("Title changed successfully");
      return;
    }

    if (result.success === false) {
      setTitleDraft(title);
      toast.error(result.message);
      setEditingTitle(false);
    }
  };

  const submitBio = async () => {
    if (bio === bioDraft) return;
    const result = await changeBio(bioDraft, profile.id);

    if (result.success && result.data) {
      setEditingBio(false);
      setBio(result.data);
      setBioDraft(result.data);
      toast.success("Bio changed successfully");
      return;
    }

    if (result.success === false) {
      setBioDraft(bio);
      toast.error(result.message);
      setEditingBio(false);
    }
  };

  return (
    <div className={styles.main}>
      <section className={styles.header}>
        <Image src={capa} className={styles.banner} alt="Capa do perfil" priority />
      </section>

      <div className={styles.layout}>
        <aside className={styles.profileAside}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarEditWrapper}>
              <Image src={ownerPic} className={styles.avatar} alt="Foto de perfil" priority />

              {ownProfile && (
                <button className={styles.editAvatarButton} title="Alterar foto">
                  <FiCamera />
                </button>
              )}
            </div>

            <div className={styles.ownerName}>
              {ownProfile && editingName ? (
                <input
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitName();
                    }
                  }}
                  onBlur={() => setEditingName(false)}
                />
              ) : (
                <span
                  className={styles.editableText}
                  onClick={() => ownProfile && setEditingName(true)}
                >
                  {nameDraft}
                  {ownProfile && <FiEdit2 className={styles.editIcon} />}
                </span>
              )}
            </div>
          </div>

          <section className={styles.profileDetails}>
            <div className={styles.title}>
              {ownProfile && editingTitle ? (
                <input
                  value={titleDraft}
                  autoFocus
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitTitle();
                    }
                  }}
                  onBlur={() => setEditingTitle(false)}
                  placeholder="Ex: Desenvolvedor Full Stack"
                />
              ) : (
                <h3
                  className={styles.editableText}
                  onClick={() => ownProfile && setEditingTitle(true)}
                >
                  {titleDraft || "Sem título"}
                  {ownProfile && <FiEdit2 className={styles.editIcon} />}
                </h3>
              )}
            </div>

            <div className={styles.description}>
              {ownProfile && editingBio ? (
                <textarea
                  value={bioDraft}
                  autoFocus
                  rows={4}
                  onChange={(e) => setBioDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitBio();
                    }
                  }}
                  onBlur={() => setEditingBio(false)}
                />
              ) : (
                <p
                  className={styles.editableText}
                  onClick={() => ownProfile && setEditingBio(true)}
                >
                  {bioDraft || "Sem descrição"}
                  {ownProfile && <FiEdit2 className={styles.editIcon} />}
                </p>
              )}
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

            {!ownProfile && <button className={styles.contactButton}>Contatar</button>}
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
            {selected === "Projetos" && (
              <ProjectsSection
                searchQuery={searchQuery}
                ownProfile={ownProfile}
                profile={profile}
              />
            )}
            {selected === "Certificações" && (
              <CertificationsSection
                searchQuery={searchQuery}
                ownProfile={ownProfile}
                profile={profile}
              />
            )}
            {selected === "Participações" && (
              <ParticipationsSection
                searchQuery={searchQuery}
                ownProfile={ownProfile}
                profile={profile}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
