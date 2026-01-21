"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface SearchContextType {
    searchQuery: string;
    debouncedSearchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "projects");

    // Sync from URL only for external changes (like back button)
    useEffect(() => {
        const urlQ = searchParams.get("q") || "";
        const urlTab = searchParams.get("tab") || "projects";

        // Only update if it's different from our current state AND our debounced state
        if (urlQ !== searchQuery && urlQ !== debouncedSearchQuery) {
            setSearchQuery(urlQ);
            setDebouncedSearchQuery(urlQ);
        }
        if (urlTab !== activeTab) setActiveTab(urlTab);
    }, [searchParams]);

    // Update debounced value and URL
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);

            const params = new URLSearchParams(searchParams.toString());
            const currentQ = params.get("q") || "";
            const currentTab = params.get("tab") || "projects";

            let changed = false;

            if (searchQuery !== currentQ) {
                if (searchQuery) params.set("q", searchQuery);
                else params.delete("q");
                changed = true;
            }

            if (activeTab !== currentTab) {
                params.set("tab", activeTab);
                changed = true;
            }

            if (changed) {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [searchQuery, activeTab, pathname, searchParams]);

    return (
        <SearchContext.Provider value={{ searchQuery, debouncedSearchQuery, setSearchQuery, activeTab, setActiveTab }}>
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (context === undefined) {
        throw new Error("useSearch must be used within a SearchProvider");
    }
    return context;
}
