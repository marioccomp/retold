"use client";

import { Input } from "@/components/ui/input";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/src/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  projectSort?: "newest" | "oldest" | "popular";
  setProjectSort?: (sort: "newest" | "oldest" | "popular") => void;
};

export default function ProfileTabsHeader({
  activeTab,
  searchQuery,
  setSearchQuery,
  projectSort,
  setProjectSort,
}: Props) {
  const { dict } = useTranslation();

  const tabItems = [
    { value: "profile", label: dict.profile.tabs.profile },
    { value: "projects", label: dict.profile.tabs.projects },
  ];

  return (
    <div className="w-full flex flex-col animate-[fadeIn_0.5s_ease-out]">
      {/* Upper Row: Tabs & Search Bar with generous spacing */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-stretch md:items-center w-full min-h-[44px] mb-8">
        <TabsList className="bg-transparent p-0 h-auto gap-8 justify-start flex-shrink-0 overflow-x-auto custom-scrollbar-hide">
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="bg-transparent border-0 border-b-[3px] border-solid border-b-transparent py-2 px-0 text-base font-bold text-muted-foreground cursor-pointer transition-all duration-300 hover:text-foreground data-[state=active]:!text-foreground data-[state=active]:!border-b-primary data-[state=active]:!bg-transparent data-[state=active]:shadow-none rounded-none whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Search Input - Flexible and high contrast */}
        <div
          className={`flex-1 transition-all duration-500 hidden md:block ${activeTab !== "profile" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"}`}
        >
          <Input
            type="text"
            placeholder={dict.profile.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 px-5 border-border rounded-xl text-[0.95rem] text-foreground focus-visible:ring-primary/20 focus-visible:border-primary h-11 shadow-sm font-medium bg-background dark:bg-muted/50 transition-all"
          />
        </div>
      </div>

      {/* Lower Row: Sorting Option - Positioned closer to the content below */}
      <div
        className={`w-full flex flex-col sm:flex-row items-center gap-4 transition-all duration-300 mb-6 ${activeTab === "projects" ? "opacity-100 h-auto visible" : "opacity-0 h-0 invisible overflow-hidden"}`}
      >
        {/* Mobile Search */}
        <div className="md:hidden w-full mb-2">
          <Input
            type="text"
            placeholder={dict.profile.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 px-4 border-border rounded-xl text-[0.9rem] text-foreground h-10 shadow-sm font-medium bg-background dark:bg-muted/50"
          />
        </div>

        {/* Sorting Select - Left aligned and closer to projects */}
        {setProjectSort && (
          <div className="w-full sm:w-auto flex-shrink-0">
            <Select
              value={projectSort}
              onValueChange={(val: "newest" | "oldest" | "popular") => setProjectSort(val)}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-background dark:bg-muted border-border cursor-pointer h-10 rounded-xl font-semibold text-foreground/80 hover:text-foreground transition-colors">
                <SelectValue placeholder={dict.feed.sort.placeholder} />
              </SelectTrigger>
              <SelectContent>
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
        )}
      </div>
    </div>
  );
}
