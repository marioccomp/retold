"use client";

import { Input } from "@/components/ui/input";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/src/i18n/client";

type Props = {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
};

export default function ProfileTabsHeader({ searchQuery, setSearchQuery }: Props) {
    const { dict } = useTranslation();

    const tabItems = [
        { value: "Perfil", label: dict.profile.tabs.profile },
        { value: "Projetos", label: dict.profile.tabs.projects },
    ];

    return (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-9 items-stretch sm:items-center w-full mb-12">
            <TabsList className="bg-transparent p-0 h-auto gap-9 justify-start w-full sm:w-auto overflow-x-auto custom-scrollbar-hide">
                {tabItems.map((tab) => (
                    <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        onClick={() => setSearchQuery("")}
                        className="bg-transparent border-0 border-b-[3px] border-solid border-b-transparent py-1 px-0 text-base font-bold text-[#6b7c7a] cursor-pointer transition-all duration-300 hover:text-[#152e2b] data-[state=active]:!text-[#152e2b] data-[state=active]:!border-b-[#05dc7f] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none whitespace-nowrap"
                    >
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            <Input
                type="text"
                placeholder={dict.profile.search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 py-2 px-4 border-[#e7eae9] rounded-xl text-[0.9rem] text-[#152e2b] sm:order-none order-first focus-visible:ring-[#05dc7f]/30 focus-visible:border-[#05dc7f] h-10 shadow-sm font-medium"
            />
        </div>
    );
}
