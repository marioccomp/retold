"use client";

import { Input } from "@/components/ui/input";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/src/i18n/client";

type Props = {
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export default function ProfileTabsHeader({ activeTab, searchQuery, setSearchQuery }: Props) {
  const { dict } = useTranslation();

  const tabItems = [
    { value: "profile", label: dict.profile.tabs.profile },
    { value: "projects", label: dict.profile.tabs.projects },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-9 items-stretch sm:items-center w-full mb-12">
      <TabsList className="bg-transparent p-0 h-auto gap-9 justify-start w-full sm:w-auto overflow-x-auto custom-scrollbar-hide">
        {tabItems.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="bg-transparent border-0 border-b-[3px] border-solid border-b-transparent py-1 px-0 text-base font-bold text-muted-foreground cursor-pointer transition-all duration-300 hover:text-foreground data-[state=active]:!text-foreground data-[state=active]:!border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none whitespace-nowrap"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {activeTab !== "profile" && (
        <Input
          type="text"
          placeholder={dict.profile.search_placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 py-2 px-4 border-border rounded-xl text-[0.9rem] text-foreground sm:order-none order-first focus-visible:ring-primary/30 focus-visible:border-primary h-10 shadow-sm font-medium animate-[fadeIn_0.3s_ease-out]"
        />
      )}
    </div>
  );
}
