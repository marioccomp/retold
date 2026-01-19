"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "@/src/i18n/client";

interface UserCardProps {
    user: {
        id: number;
        name: string | null;
        username: string | null;
        image: string | null;
        title: string | null;
        bio: string | null;
        skills: string[];
    };
}

export function UserCard({ user }: UserCardProps) {
    const { dict } = useTranslation();
    const displayName = user.name || user.username || "User";
    const displayHandle = user.username ? `@${user.username}` : "";

    return (
        <Link href={`/${user.username}`} className="block h-full cursor-pointer">
            <Card className="group flex flex-col items-center p-6 bg-white border border-[#d4e5d7] shadow-sm hover:shadow-md transition-all duration-300 hover:border-[#33bd19]/50 h-full cursor-pointer">
                <Avatar className="w-24 h-24 mb-4 ring-2 ring-offset-2 ring-transparent group-hover:ring-[#33bd19]/20 transition-all">
                    <AvatarImage src={user.image || ""} alt={displayName} className="object-cover" />
                    <AvatarFallback className="bg-[#f0fdf4] text-[#152e2b] text-xl font-medium">
                        {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div className="text-center w-full mb-4 flex-1">
                    <h3 className="text-lg font-bold text-[#152e2b] truncate w-full" title={displayName}>
                        {displayName}
                    </h3>
                    {displayHandle && (
                        <p className="text-sm text-[#6b7c7a] font-medium mt-0.5">{displayHandle}</p>
                    )}

                    {/* Title */}
                    <p className="text-sm font-semibold text-[#152e2b] mt-3 line-clamp-1">
                        {user.title || dict.feed.usercard?.no_title || "No title defined"}
                    </p>

                    {/* Bio / Headline */}
                    <p className="text-xs text-[#6b7c7a] mt-1 line-clamp-2 min-h-[32px]">
                        {user.bio || ""}
                    </p>
                </div>

                <div className="flex gap-1.5 flex-wrap justify-center mb-6 w-full h-[52px] overflow-hidden content-start">
                    {user.skills && user.skills.length > 0 ? (
                        user.skills.slice(0, 3).map((skill, index) => (
                            <Badge
                                key={index}
                                className="bg-[#05dc7f]/10 text-[#047857] hover:bg-[#05dc7f]/20 border-none px-2.5 py-1 text-xs"
                            >
                                {skill}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs text-[#a0aaa8] italic">{dict.feed.usercard?.no_skills || "No skills listed"}</span>
                    )}
                </div>

                <div className="w-full mt-auto">
                    <Button
                        className="w-full bg-white text-[#152e2b] border-2 border-[#d4e5d7] group-hover:bg-[#f8fdf5] group-hover:border-[#33bd19] group-hover:text-[#004d40] transition-colors font-semibold shadow-none pointer-events-none"
                    >
                        {dict.feed.usercard?.view_profile || "View Profile"}
                    </Button>
                </div>
            </Card>
        </Link>
    );
}
