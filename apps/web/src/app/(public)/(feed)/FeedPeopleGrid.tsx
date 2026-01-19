"use client";

import { useQuery } from "@tanstack/react-query";
import { searchUsersAction } from "@/src/domains/user/actions/search-users.action";
import { UserCard } from "@/src/components/UserCard";
import { useTranslation } from "@/src/i18n/client";

interface FeedPeopleGridProps {
    searchQuery: string;
}

export default function FeedPeopleGrid({ searchQuery }: FeedPeopleGridProps) {
    const { dict } = useTranslation();

    const { data: users, isLoading } = useQuery({
        queryKey: ["users", searchQuery],
        queryFn: async () => {
            const result = await searchUsersAction(searchQuery);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
    console.log(users)


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 w-full col-span-full">
                <div className="w-8 h-8 border-2 border-[#33bd19] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[#6b7c7a]">{dict.feed.feedpeoplegrid?.loading || "Finding people..."}</p>
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[#6b7c7a] text-lg">{dict.feed.feedpeoplegrid?.no_users?.title || "No people found"}</p>
                <p className="text-[#a0aaa8] text-sm mt-1">{dict.feed.feedpeoplegrid?.no_users?.description || "Try searching for a name or username"}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full animate-[fadeIn_0.6s_ease-out_forwards]">
            {users.map((user: any) => (
                <UserCard key={user.id} user={user} />
            ))}
        </div>
    );
}
