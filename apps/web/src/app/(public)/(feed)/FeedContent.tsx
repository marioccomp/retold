"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import FeedProjectsGrid from "./FeedProjectsGrid";
import FeedPeopleGrid from "./FeedPeopleGrid";
import { FiSearch } from "react-icons/fi";
import { useTranslation } from "@/src/i18n/client";
import { useQuery } from "@tanstack/react-query";
import { getFeedProjects } from "./actions/get-feed-projects.action";


type Props = {
    projects: ProjectCardDTO[];
};

export default function FeedContent({ projects }: Props) {
    const { dict } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");

    // Get project selection from URL
    const searchParams = useSearchParams();
    const urlTab = searchParams.get("tab") || "projects";
    const [activeTab, setActiveTab] = useState(urlTab);
    const isProjectSelected = !!searchParams.get("project");

    // Sync local state when URL changes (e.g. back button)
    useEffect(() => {
        setActiveTab(urlTab);
    }, [urlTab]);

    // Define tabs using keys that we can map to translations
    const tabs = [
        { key: "projects", label: dict.feed.feedcontent.tabs.projects },
        { key: "people", label: dict.feed.feedcontent.tabs.people }
    ];


    // Auto-scroll to feed when navigating with hash
    useEffect(() => {
        if (window.location.hash === '#feed-content') {
            setTimeout(() => {
                document.getElementById('feed-content')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, []);

    const { data: feedProjects } = useQuery({
        queryKey: ["feed-projects"],
        queryFn: () => getFeedProjects(),
        initialData: projects,
        refetchInterval: (query) => {
            const projects = query.state.data;
            const isAnalyzing = projects?.some(
                (p: any) => p.status === "ANALYZING" || p.status === "PENDING"
            );
            return isAnalyzing ? 3000 : false;
        },
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value); // Aba muda instantaneamente
        setSearchQuery("");

        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });

        // Pequeno delay para garantir que a aba mude antes do scroll se necessário
        setTimeout(() => {
            const element = document.getElementById('feed-content');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }, 10);
    };

    return (
        <div id="feed-content" className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col items-center relative scroll-mt-4">
            {/* Gradiente sutil para conectar com o hero */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white via-white/40 to-transparent pointer-events-none -z-10" />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* Sticky Tabs Header */}

                {!isProjectSelected && (
                    <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-xl pt-5 pb-5 -mx-6 px-6 md:-mx-12 md:px-12 border-b border-[#e7eae9]/60 mb-8 flex flex-row gap-6 items-center w-[calc(100%+48px)] md:w-[calc(100%+96px)]">
                        <TabsList className="bg-transparent p-0 h-auto gap-6 justify-start shrink-0">
                            {tabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="bg-transparent border-0 border-b-[3px] border-solid border-b-transparent py-1.5 px-0 text-base font-medium text-[#6b7c7a] cursor-pointer transition-all duration-300 hover:text-[#152e2b] data-[state=active]:!text-[#152e2b] data-[state=active]:!border-b-[#05dc7f] data-[state=active]:[text-shadow:0.5px_0_0_currentColor] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none whitespace-nowrap"
                                >
                                    {tab.label}
                                </TabsTrigger>

                            ))}
                        </TabsList>

                        {/* Modern Search Bar */}
                        <div className="flex-1 relative group">
                            <FiSearch
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none transition-colors duration-300 group-focus-within:text-[#05dc7f]"
                                size={18}
                            />
                            <Input
                                type="text"
                                placeholder={dict.feed.feedcontent.search_placeholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-2.5 pl-11 pr-5 rounded-full text-[0.9rem] text-[#152e2b] h-11
                                    bg-white/70 backdrop-blur-sm border-[#e7eae9] 
                                    placeholder:text-[#9ca3af] font-medium
                                    shadow-sm hover:shadow-md hover:border-[#d4e5d7]
                                    focus-visible:ring-2 focus-visible:ring-[#05dc7f]/25 focus-visible:border-[#05dc7f] 
                                    focus-visible:shadow-lg focus-visible:shadow-[#05dc7f]/10
                                    transition-all duration-300"
                            />
                        </div>
                    </div>
                )}

                {/* Projects Grid */}
                <div className="animate-[fadeIn_0.3s_ease-out_forwards] pb-20">
                    <TabsContent value="projects" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0">
                        <FeedProjectsGrid
                            projects={feedProjects || projects}
                            searchQuery={searchQuery}
                        />
                    </TabsContent>

                    <TabsContent value="people" className="m-0 p-0 ring-0 focus-visible:ring-0">
                        <FeedPeopleGrid searchQuery={searchQuery} />
                    </TabsContent>


                </div>
            </Tabs>
        </div>
    );
}
