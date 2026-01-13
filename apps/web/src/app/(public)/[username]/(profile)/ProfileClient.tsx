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
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { changeBio, changeName, changeTitle } from "../_actions/edit-profle";
import { getProfile } from "../_actions/get-profile"; // Action de busca

import ProjectsSection from "./ProjectsSection";
import CertificationsSection from "./CertificationsSection";
import ParticipationsSection from "./ParticipationsSection";

type Props = {
  username: string;
  ownProfile: boolean;
};

export default function ProfileClient({ username, ownProfile }: Props) {
  const [selected, setSelected] = useState("Projetos");
  const tabs = ["Projetos", "Certificações", "Participações"];
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => getProfile(username),
    staleTime: 1000 * 60 * 5,
    refetchInterval: (query) => {
      const projects = query.state.data?.projects;
      const isAnalyzing = projects?.some(
        (p: any) => p.status === "ANALYZING" || p.status === "PENDING"
      );
      return isAnalyzing ? 3000 : false;
    },
  });

  if (!profile) return null;

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

  function capitalizeFirstLetter(text: string) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  const updateProfileMutation = useMutation({
    mutationFn: async ({ type, value }: { type: "name" | "bio" | "title"; value: string }) => {
      switch (type) {
        case "name":
          return changeName(value, profile.id);
        case "bio":
          return changeBio(value, profile.id);
        case "title":
          return changeTitle(value, profile.id);
      }
    },
    onMutate: async ({ type, value }) => {
      await queryClient.cancelQueries({ queryKey: ["profile", username] });

      const previousProfile = queryClient.getQueryData<PublicProfileDTO>(["profile", username]);

      if (previousProfile) {
        queryClient.setQueryData<PublicProfileDTO>(["profile", username], {
          ...previousProfile,
          [type]: value,
        });
      }

      return { previousProfile };
    },
    onError: (err, variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["profile", username], context.previousProfile);
      }
      toast.error("Failed to update profile");
    },
    onSuccess: (data, variables) => {
      if (!data.success) {
        toast.error(data.message);
        return;
      }
      toast.success(`${capitalizeFirstLetter(variables.type)} updated successfully`);
      setEditingName(false);
      setEditingBio(false);
      setEditingTitle(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
    },
  });

  const handleSaveName = () => {
    if (nameDraft === profile.name) {
      setEditingName(false);
      return;
    }
    updateProfileMutation.mutate({ type: "name", value: nameDraft });
  };

  const handleSaveTitle = () => {
    if (titleDraft === profile.title) {
      setEditingTitle(false);
      return;
    }
    updateProfileMutation.mutate({ type: "title", value: titleDraft });
  };

  const handleSaveBio = () => {
    if (bioDraft === profile.bio) {
      setEditingBio(false);
      return;
    }
    updateProfileMutation.mutate({ type: "bio", value: bioDraft });
  };

  const startEditingName = () => {
    setNameDraft(profile.name ?? "");
    setEditingName(true);
  };
  const startEditingTitle = () => {
    setTitleDraft(profile.title ?? "");
    setEditingTitle(true);
  };
  const startEditingBio = () => {
    setBioDraft(profile.bio ?? "");
    setEditingBio(true);
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
                      handleSaveName();
                    }
                  }}
                  onBlur={() => setEditingName(false)}
                  disabled={updateProfileMutation.isPending}
                  minLength={3}
                  maxLength={20}
                />
              ) : (
                <span
                  className={styles.editableText}
                  onClick={ownProfile ? startEditingName : undefined}
                >
                  {profile.name}
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
                      handleSaveTitle();
                    }
                  }}
                  onBlur={() => setEditingTitle(false)}
                  disabled={updateProfileMutation.isPending}
                  placeholder="Ex: Desenvolvedor Full Stack"
                  maxLength={50}
                />
              ) : (
                <h3
                  className={styles.editableText}
                  onClick={ownProfile ? startEditingTitle : undefined}
                >
                  {profile.title || "Sem título"}
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
                      handleSaveBio();
                    }
                  }}
                  onBlur={() => setEditingBio(false)}
                  maxLength={280}
                />
              ) : (
                <p
                  className={styles.editableText}
                  onClick={ownProfile ? startEditingBio : undefined}
                >
                  {profile.bio || "Sem descrição"}
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
