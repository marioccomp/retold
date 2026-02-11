"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getProfile } from "../_actions/get-profile";
import { Tabs, TabsContent } from "@/components/ui/tabs";

// Specialized Components
import ProfileBanner from "./components/layout/ProfileBanner";
import ProfileSidebar from "./components/layout/ProfileSidebar";
import ProfileTabsHeader from "./components/layout/ProfileTabsHeader";
import ProfileSection from "./ProfileSection";
import ProjectsSection from "./ProjectsSection";
import CertificationsSection from "./not-used/CertificationsSection";
import ParticipationsSection from "./not-used/ParticipationsSection";
import EditProfileModal from "./components/EditProfileModal";

type Props = {
  username: string;
  ownProfile: boolean;
};

import { useDebounce } from "@/src/hooks/useDebounce";

// ... existing imports

export default function ProfileClient({ username, ownProfile }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(urlTab);

  // Pagination for projects
  const page = Number(searchParams.get("page")) || 1;

  // Sync local state when URL changes (e.g. back button)
  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [projectSort, setProjectSort] = useState<"newest" | "oldest" | "popular">("newest");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", username, page, debouncedSearchQuery, projectSort],
    queryFn: () => getProfile(username, page, debouncedSearchQuery, projectSort),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Garante que o perfil anterior continue visível enquanto carrega a nova busca
    refetchInterval: (query) => {
      const projects = query.state.data?.projects;
      const isAnalyzing = projects?.some(
        (p: any) => p.status === "ANALYZING" || p.status === "PENDING"
      );
      return isAnalyzing ? 3000 : false;
    },
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    // Remove project param when changing tabs to avoid the project panel persisting
    params.delete("project");
    // Reset page on tab switch
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* 1. Header Banner */}
      <ProfileBanner cover={profile.cover} ownProfile={ownProfile} username={username} />

      {/* 2. Main Layout Container */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] gap-6 md:gap-8 lg:gap-12 px-5 sm:px-8 md:px-8 lg:px-8 xl:px-16">
        {/* 3. Sidebar */}
        <ProfileSidebar
          profile={profile}
          ownProfile={ownProfile}
          onEditClick={() => setIsEditModalOpen(true)}
        />

        {/* 4. Main Content Area */}
        <main className="min-h-[200px] mt-0 md:mt-0 max-md:mt-12">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* 5. Tabs & Search */}
            <ProfileTabsHeader
              activeTab={activeTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* 6. Tabs Content */}
            <div className="pb-20">
              <TabsContent
                value="profile"
                className="m-0 p-0 ring-0 focus-visible:ring-0 outline-none"
              >
                <ProfileSection profile={profile} ownProfile={ownProfile} />
              </TabsContent>

              <TabsContent
                value="projects"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0 outline-none"
              >
                <ProjectsSection
                  searchQuery={searchQuery}
                  ownProfile={ownProfile}
                  profile={profile}
                  onPageChange={(newPage) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", String(newPage));
                    router.push(`${pathname}?${params.toString()}`, { scroll: false });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  sort={projectSort}
                  onSortChange={setProjectSort}
                />
              </TabsContent>

              {/* Unused Sections (for reference) */}
              <TabsContent value="Certificações" className="hidden">
                <CertificationsSection
                  searchQuery={searchQuery}
                  ownProfile={ownProfile}
                  profile={profile}
                />
              </TabsContent>
              <TabsContent value="Participações" className="hidden">
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

      {/* Global Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        username={username}
      />
    </div>
  );
}
