"use client";

import { useQuery } from "@tanstack/react-query";
import { searchUsersAction } from "@/src/domains/user/actions/search-users.action";
import { UserCard } from "@/src/components/UserCard";
import { useTranslation } from "@/src/i18n/client";
import { useSession } from "next-auth/react";
import { useSearch } from "@/src/providers/SearchContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PaginationControls } from "@/src/components/ui/pagination-controls";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FeedPeopleGrid() {
  const { debouncedSearchQuery } = useSearch();
  const { dict } = useTranslation();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use a specific param for people pagination to avoid conflict with projects
  const page = Number(searchParams.get("peoplePage")) || 1;
  const limit = 12;
  const [peopleSort, setPeopleSort] = useState<"active" | "newest" | "oldest" | "name">("active");

  const { data: result, isLoading } = useQuery({
    queryKey: ["users", debouncedSearchQuery, page, limit, peopleSort],
    queryFn: async () => {
      const result = await searchUsersAction(debouncedSearchQuery, page, limit, peopleSort);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const users = result?.users;
  const metadata = result?.metadata;

  // Use users directly, as the backend already filters out the current user
  const filteredUsers = users;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("peoplePage", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // Optional: Scroll to top of grid
    const element = document.getElementById("feed-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] py-20 w-full col-span-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">
          {dict.feed.feedpeoplegrid?.loading || "Finding people..."}
        </p>
      </div>
    );
  }

  if (!filteredUsers || filteredUsers.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center min-h-[500px] py-16 text-center">
        <p className="text-muted-foreground text-lg font-medium">
          {dict.feed.feedpeoplegrid?.no_users?.title || "No people found"}
        </p>
        <p className="text-muted-foreground/80 text-sm mt-1">
          {dict.feed.feedpeoplegrid?.no_users?.description ||
            "Try searching for a name or username"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-[fadeIn_0.6s_ease-out_forwards]">
      <div className="flex w-full">
        <Select
          value={peopleSort}
          onValueChange={(val: "active" | "newest" | "oldest" | "name") => setPeopleSort(val)}
        >
          <SelectTrigger className="w-[180px] bg-background border-border cursor-pointer">
            <SelectValue placeholder={dict.feed.sort.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active" className="cursor-pointer">
              {dict.feed.sort.most_active}
            </SelectItem>
            <SelectItem value="newest" className="cursor-pointer">
              {dict.feed.sort.newest}
            </SelectItem>
            <SelectItem value="oldest" className="cursor-pointer">
              {dict.feed.sort.oldest}
            </SelectItem>
            <SelectItem value="name" className="cursor-pointer">
              {dict.feed.sort.alphabetical}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
        {filteredUsers.map((user: any) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>

      {/* Pagination Controls */}
      {metadata && metadata.totalPages > 1 && (
        <PaginationControls
          currentPage={metadata.page}
          totalPages={metadata.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
