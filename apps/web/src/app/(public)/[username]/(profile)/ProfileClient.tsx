"use client";

import Image from "next/image";
import { useState, memo } from "react";
import capa from "@/assets/capa.jpg";
import ownerPic from "@/assets/foto.jpeg";
import { FiGithub, FiLinkedin, FiCamera, FiEdit2 } from "react-icons/fi";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getProfile } from "../_actions/get-profile";
import EditProfileModal from "./components/EditProfileModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ProjectsSection from "./ProjectsSection";
import CertificationsSection from "./CertificationsSection";
import ParticipationsSection from "./ParticipationsSection";

// Componente memoizado fora do ProfileClient
const SocialLinkItem = memo(function SocialLinkItem({
  type,
  url,
  Icon,
}: {
  type: "github" | "linkedin";
  url: string | null;
  Icon: typeof FiGithub;
}) {
  if (!url) return null;

  return (
    <li>
      <Button
        variant="ghost"
        size="icon"
        asChild
        className="w-[42px] h-[42px] border border-[#e7eae9] rounded-[10px] bg-white text-[#152e2b] hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[rgba(5,220,127,0.06)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(5,220,127,0.2)]"
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={type === "github" ? "GitHub" : "LinkedIn"}
        >
          <Icon size={18} />
        </a>
      </Button>
    </li>
  );
});

type Props = {
  username: string;
  ownProfile: boolean;
};

export default function ProfileClient({ username, ownProfile }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const tabs = ["Projetos", "Certificações", "Participações"];

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header/Banner */}
      <section className="py-6 px-4 sm:px-8 md:px-16 lg:pl-24 lg:pr-16">
        <Image
          src={capa}
          className="w-full h-[160px] sm:h-[200px] md:h-[250px] object-cover rounded-xl block"
          alt="Capa do perfil"
          priority
        />
      </section>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] gap-6 md:gap-8 lg:gap-12 px-5 sm:px-8 md:px-8 lg:px-8 xl:px-16">
        {/* Aside - Profile Info */}
        <aside className="flex flex-col items-center w-full md:pl-0 lg:pl-12">
          <div className="-mt-20 sm:-mt-[100px] md:-mt-[110px] lg:-mt-[135px] flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[190px] md:h-[190px] lg:w-[230px] lg:h-[230px] border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.08)] bg-white">
                <AvatarImage
                  src={ownerPic.src}
                  alt="Foto de perfil"
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl font-bold text-[#152e2b]">
                  {(profile.name || username || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>

              {ownProfile && (
                <Button
                  size="icon"
                  className="absolute bottom-3 right-3 w-9 h-9 rounded-full border-none bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] hover:scale-105 hover:shadow-[0_6px_16px_rgba(5,220,127,0.4)] transition-all duration-200"
                  title="Alterar foto"
                  onClick={() => {
                    // TODO: Implementar edição de foto separado ou no modal? 
                    // Como não está no scopo atual manteremos ou adicionaremos depois.
                    // O usuário pediu modal para nome, titulo, descrição e links.
                  }}
                >
                  <FiCamera />
                </Button>
              )}
            </div>

            {/* Owner Name */}
            <div className="mt-3 text-xl font-semibold text-[#152e2b]">
              <span>{profile.name}</span>
            </div>
          </div>

          {/* Profile Details Section */}
          <section className="mt-3 w-full max-w-[300px] md:max-w-full flex flex-col gap-4 items-center">
            {/* Title */}
            <div className="w-full rounded-lg p-4 text-center border border-[#e7eae9] overflow-hidden">
              <h3 className="m-0 break-all overflow-wrap-anywhere inline-block font-semibold text-[#152e2b]">
                {profile.title || (
                  <span className="text-[#a0aaa8] italic font-normal text-sm">Sem título definido</span>
                )}
              </h3>
            </div>

            {/* Description/Bio */}
            <div className="w-full rounded-lg p-4 text-center border border-[#e7eae9] overflow-hidden">
              <p className="m-0 break-all text-[#6b7c7a]">
                {profile.bio || (
                  <span className="text-[#a0aaa8] italic text-sm">Nenhuma descrição</span>
                )}
              </p>
            </div>

            {/* Social Links */}
            <ul className="flex flex-wrap items-center justify-center gap-3 p-0 m-0 list-none w-full">
              <SocialLinkItem
                type="github"
                url={profile.githubUrl}
                Icon={FiGithub}
              />
              <SocialLinkItem
                type="linkedin"
                url={profile.linkedinUrl}
                Icon={FiLinkedin}
              />
            </ul>

            {/* Stats */}
            <div className="w-full flex border border-[#e7eae9] rounded-[10px] overflow-hidden bg-[#fafafa]">
              <p className="flex-1 m-0 py-3 text-center text-[0.9rem] text-[#6b7c7a]">
                <span className="block text-[1.1rem] font-semibold text-[#152e2b]">12.5k</span> views
              </p>
              <p className="flex-1 m-0 py-3 text-center text-[0.9rem] text-[#6b7c7a] border-l border-[#e7eae9]">
                <span className="block text-[1.1rem] font-semibold text-[#152e2b]">482</span> likes
              </p>
            </div>

            {/* Contact Button / Edit Button */}
            {ownProfile ? (
              <Button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full h-11 border-none rounded-[10px] bg-[#05dc7f] text-[#0f2f28] text-base font-medium cursor-pointer transition-colors duration-200 hover:bg-[#03c56f] flex items-center justify-center gap-2"
              >
                Edit Profile
              </Button>
            ) : (
              <Button className="w-full h-11 border-none rounded-[10px] bg-[#05dc7f] text-[#0f2f28] text-base font-medium cursor-pointer transition-colors duration-200 hover:bg-[#03c56f]">
                Contact
              </Button>
            )}
          </section>
        </aside>

        {/* Main Content */}
        <main className="min-h-[200px] mt-0 md:mt-0 max-md:mt-12">
          <Tabs defaultValue="Projetos" className="w-full">
            {/* Tabs Header */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-9 items-stretch sm:items-center w-full mb-12">
              <TabsList className="bg-transparent p-0 h-auto gap-9 justify-start w-full sm:w-auto overflow-x-auto">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    onClick={() => setSearchQuery("")}
                    className="bg-transparent border-0 border-b-[3px] border-solid border-b-transparent py-1 px-0 text-base font-medium text-[#6b7c7a] cursor-pointer transition-colors duration-300 hover:text-[#152e2b] data-[state=active]:!text-[#152e2b] data-[state=active]:!border-b-[#05dc7f] data-[state=active]:[text-shadow:0.6px_0_0_currentColor] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <Input
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 py-2 px-4 border-[#e7eae9] rounded-lg text-[0.9rem] text-[#152e2b] sm:order-none order-first focus-visible:ring-[#05dc7f]/30 focus-visible:border-[#05dc7f] h-auto"
              />
            </div>

            {/* Projects Grid */}
            <div className="animate-[fadeIn_0.6s_ease-out_forwards] pb-20">
              <TabsContent value="Projetos" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0">
                <ProjectsSection
                  searchQuery={searchQuery}
                  ownProfile={ownProfile}
                  profile={profile}
                />
              </TabsContent>

              <TabsContent value="Certificações" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0">
                <CertificationsSection
                  searchQuery={searchQuery}
                  ownProfile={ownProfile}
                  profile={profile}
                />
              </TabsContent>

              <TabsContent value="Participações" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0">
                <ParticipationsSection
                  searchQuery={searchQuery}
                  ownProfile={ownProfile}
                  profile={profile}
                />
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        username={username}
      />
    </div>
  );
}
