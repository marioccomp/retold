"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import type { ProjectSortType } from "./actions/constants";
import FeedProjectsGrid from "./FeedProjectsGrid";
import FeedPeopleGrid from "./FeedPeopleGrid";
import { FiSearch } from "react-icons/fi";
import { useTranslation } from "@/src/i18n/client";
import { useQuery } from "@tanstack/react-query";
import { getFeedProjects } from "./actions/get-feed-projects.action";
import { useSearch } from "@/src/providers/SearchContext";

type FeedData = {
  projects: ProjectCardDTO[];
  metadata: { total: number; page: number; limit: number; totalPages: number };
};

type Props = {
  initialData: FeedData;
};

export default function FeedContent({ initialData }: Props) {
  const { dict } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { searchQuery, debouncedSearchQuery, setSearchQuery, activeTab, setActiveTab } =
    useSearch();
  const [projectSort, setProjectSort] = useState<ProjectSortType>("recommended");
  const isProjectSelected = !!searchParams.get("project");

  // Define tabs using keys that we can map to translations
  const tabs = [
    { key: "projects", label: dict.feed.feedcontent.tabs.projects },
    { key: "people", label: dict.feed.feedcontent.tabs.people },
  ];

  // Auto-scroll to feed when navigating with hash

  // Auto-scroll to feed when navigating with hash
  useEffect(() => {
    if (window.location.hash === "#feed-content") {
      setTimeout(() => {
        document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  const page = Number(searchParams.get("page")) || 1;

  const { data: feedData } = useQuery({
    queryKey: ["feed-projects", page, debouncedSearchQuery, projectSort],
    queryFn: () => getFeedProjects(page, 12, debouncedSearchQuery, projectSort),
    initialData,
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
    setSearchQuery(""); // Reset search on tab change per original behavior

    // Pequeno delay para garantir que a aba mude antes do scroll se necessário
    setTimeout(() => {
      const element = document.getElementById("feed-content");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 10);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // Scroll to top of feed content
    const element = document.getElementById("feed-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      id="feed-content"
      className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col items-center relative scroll-mt-4"
    >
      {/* Gradiente sutil para conectar com o hero */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background via-background/40 to-transparent pointer-events-none -z-10" />

      {/* Hero Search Bar - Main Feed Search */}
      {!isProjectSelected && (
        <div
          id="feed-search-container"
          className="w-full max-w-2xl mb-8 mt-4 relative group animate-[fadeIn_0.5s_ease-out_forwards]"
        >
          <div className="relative">
            <FiSearch
              className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-colors duration-300 group-focus-within:text-primary"
              size={22}
            />
            <Input
              type="text"
              placeholder={
                activeTab === "people"
                  ? dict.feed.feedcontent.search_placeholder_people
                  : dict.feed.feedcontent.search_placeholder_projects
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-4 pl-14 pr-6 rounded-full text-lg text-foreground h-auto
                                bg-background dark:bg-muted/20 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-border 
                                placeholder:text-muted-foreground font-medium
                                hover:shadow-[0_4px_25px_-5px_rgba(0,0,0,0.08)] hover:border-primary/30
                                focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary 
                                focus-visible:shadow-[0_4px_30px_-5px_rgba(5,220,127,0.15)]
                                transition-all duration-300"
            />
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full relative">
        {/* Minimal Static Tabs Header */}
        {!isProjectSelected && (
          <div className="mb-8 border-b border-border flex flex-row justify-center items-center w-full">
            <TabsList className="bg-transparent p-0 h-auto gap-8 justify-center shrink-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="bg-transparent border-0 py-2 text-sm font-medium text-muted-foreground cursor-pointer transition-all duration-300 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none whitespace-nowrap relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 data-[state=active]:after:w-full"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}

        {/* Projects Grid */}
        <div className="animate-[fadeIn_0.3s_ease-out_forwards] pb-20">
          <TabsContent
            value="projects"
            className="flex flex-col gap-8 m-0 p-0 ring-0 focus-visible:ring-0"
          >
            <div className="flex w-full">
              <Select
                value={projectSort}
                onValueChange={(val: ProjectSortType) => setProjectSort(val)}
              >
                <SelectTrigger className="w-[180px] bg-background dark:bg-muted border-border cursor-pointer">
                  <SelectValue placeholder={dict.feed.sort.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended" className="cursor-pointer">
                    {dict.feed.sort.recommended}
                  </SelectItem>
                  <SelectItem value="newest" className="cursor-pointer">
                    {dict.feed.sort.newest}
                  </SelectItem>
                  <SelectItem value="oldest" className="cursor-pointer">
                    {dict.feed.sort.oldest}
                  </SelectItem>
                  <SelectItem value="popular" className="cursor-pointer">
                    {dict.feed.sort.popular}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FeedProjectsGrid
              projects={feedData?.projects || initialData.projects}
              currentPage={feedData?.metadata?.page || 1}
              totalPages={feedData?.metadata?.totalPages || 1}
              onPageChange={handlePageChange}
            />
          </TabsContent>

          <TabsContent value="people" className="m-0 p-0 ring-0 focus-visible:ring-0">
            <FeedPeopleGrid />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
