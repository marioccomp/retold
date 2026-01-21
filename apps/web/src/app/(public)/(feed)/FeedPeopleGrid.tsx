"use client";

import { useQuery } from "@tanstack/react-query";
import { searchUsersAction } from "@/src/domains/user/actions/search-users.action";
import { UserCard } from "@/src/components/UserCard";
import { FiSearch } from "react-icons/fi";
import { useTranslation } from "@/src/i18n/client";
import { useSession } from "next-auth/react";
import { useSearch } from "@/src/providers/SearchContext";

interface FeedPeopleGridProps {
    searchQuery: string;
}

export default function FeedPeopleGrid() {
    const { debouncedSearchQuery } = useSearch();
    const { dict } = useTranslation();
    const session = useSession();

    const { data: users, isLoading } = useQuery({
        queryKey: ["users", debouncedSearchQuery],
        queryFn: async () => {
            const result = await searchUsersAction(debouncedSearchQuery);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const filteredUsers = users?.filter(
        (user: any) => user.username !== session.data?.user?.username
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] py-20 w-full col-span-full">
                <div className="w-8 h-8 border-2 border-[#05dc7f] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[#6b7c7a] font-medium">{dict.feed.feedpeoplegrid?.loading || "Finding people..."}</p>
            </div>
        );
    }

    if (!filteredUsers || filteredUsers.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center min-h-[500px] py-16 text-center">
                <p className="text-[#6b7c7a] text-lg font-medium">{dict.feed.feedpeoplegrid?.no_users?.title || "No people found"}</p>
                <p className="text-[#a0aaa8] text-sm mt-1">{dict.feed.feedpeoplegrid?.no_users?.description || "Try searching for a name or username"}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full animate-[fadeIn_0.6s_ease-out_forwards]">
            {filteredUsers.map((user: any) => (
                <UserCard key={user.id} user={user} />
            ))}
        </div>
    );
}
