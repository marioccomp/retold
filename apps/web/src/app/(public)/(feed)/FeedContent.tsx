"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import FeedProjectsGrid from "./FeedProjectsGrid";
import { FiSearch } from "react-icons/fi";

type Props = {
    projects: ProjectCardDTO[];
};

export default function FeedContent({ projects }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const tabs = ["Projetos", "Pessoas"];

    // Auto-scroll to feed when navigating with hash
    useEffect(() => {
        if (window.location.hash === '#feed-content') {
            setTimeout(() => {
                document.getElementById('feed-content')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, []);

    return (
        <div id="feed-content" className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col items-center relative scroll-mt-4">
            {/* Gradient transition from hero */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f8fdf5] to-transparent pointer-events-none -z-10" />

            <Tabs defaultValue="Projetos" className="w-full">
                {/* Sticky Tabs Header */}
                <div className="sticky top-16 z-40 bg-gradient-to-b from-[#fafdf8] to-white/95 backdrop-blur-lg pt-4 pb-4 -mx-6 px-6 md:-mx-12 md:px-12 border-b border-[#d4e5d7] mb-8 flex flex-row gap-6 items-center w-[calc(100%+48px)] md:w-[calc(100%+96px)] shadow-sm">
                    <TabsList className="bg-transparent p-0 h-auto gap-6 justify-start shrink-0">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                onClick={() => setSearchQuery("")}
                                className="bg-transparent border-0 border-b-[3px] border-solid border-b-transparent py-1 px-0 text-base font-medium text-[#6b7c7a] cursor-pointer transition-colors duration-300 hover:text-[#152e2b] data-[state=active]:!text-[#152e2b] data-[state=active]:!border-b-[#33bd19] data-[state=active]:[text-shadow:0.6px_0_0_currentColor] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none whitespace-nowrap"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" size={18} />
                        <Input
                            type="text"
                            placeholder="Pesquisar projetos, pessoas, tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2.5 pl-10 pr-4 border-[#d4e5d7] rounded-xl text-[0.9rem] text-[#152e2b] focus-visible:ring-[#33bd19]/30 focus-visible:border-[#33bd19] h-auto bg-white/80 placeholder:text-[#9ca3af]"
                        />
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="animate-[fadeIn_0.6s_ease-out_forwards] pb-20">
                    <TabsContent value="Projetos" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 m-0 p-0 ring-0 focus-visible:ring-0">
                        <FeedProjectsGrid
                            projects={projects}
                            searchQuery={searchQuery}
                        />
                    </TabsContent>

                    <TabsContent value="Pessoas" className="m-0 p-0 ring-0 focus-visible:ring-0">
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-[#6b7c7a] text-lg">Em breve</p>
                            <p className="text-[#a0aaa8] text-sm mt-1">A pesquisa por pessoas estará disponível em breve</p>
                        </div>
                    </TabsContent>

                </div>
            </Tabs>
        </div>
    );
}
