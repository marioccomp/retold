"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "@/src/i18n/client";
import { FollowButton } from "./FollowButton";
import { useSession } from "next-auth/react";

interface UserCardProps {
  user: {
    id: number;
    name: string | null;
    username: string | null;
    image: string | null;
    cover: string | null;
    title: string | null;
    bio: string | null;
    skills: string[];
    isFollowing?: boolean;
  };
}

export function UserCard({ user }: UserCardProps) {
  const { data: session } = useSession();
  const userId = Number(session?.user.id);
  const { dict } = useTranslation();
  const displayName = user.name || user.username || "User";
  const displayHandle = user.username ? `@${user.username}` : "";

  return (
    <Link href={`/${user.username}`} className="block h-full cursor-pointer">
      <Card className="group flex flex-col items-center pt-0 bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/50 h-full cursor-pointer overflow-hidden">
        {/* Cover Banner - edge to edge, no padding */}
        <div className="w-full h-20 bg-gradient-to-r from-primary to-primary/80 relative rounded-t-xl overflow-hidden">
          {user.cover && (
            <img
              src={user.cover}
              alt={`${displayName}'s cover`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Content with avatar overlapping - avatar overlaps half into cover */}
        <div className="px-6 pb-6 flex flex-col items-center w-full -mt-16 relative z-10">
          <Avatar className="w-24 h-24 mb-4 ring-4 ring-background group-hover:ring-primary/20 transition-all bg-background shadow-sm">
            <AvatarImage src={user.image || ""} alt={displayName} className="object-cover" />
            <AvatarFallback className="bg-secondary text-foreground text-xl font-medium">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center w-full mb-4 flex-1">
            <h3 className="text-lg font-bold text-foreground truncate w-full" title={displayName}>
              {displayName}
            </h3>
            {displayHandle && (
              <p className="text-sm text-muted-foreground font-medium mt-0.5">{displayHandle}</p>
            )}

            {/* Title */}
            <p className="text-sm font-semibold text-foreground mt-3 line-clamp-1">
              {user.title || dict.feed.usercard?.no_title || "No title defined"}
            </p>

            {/* Bio / Headline */}
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">
              {user.bio || ""}
            </p>
          </div>

          <div className="flex gap-1.5 flex-wrap justify-center mb-6 w-full h-[52px] overflow-hidden content-start">
            {user.skills && user.skills.length > 0 ? (
              user.skills.slice(0, 3).map((skill, index) => (
                <Badge
                  key={index}
                  className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-2.5 py-1 text-xs"
                >
                  {skill}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">
                {dict.feed.usercard?.no_skills || "No skills listed"}
              </span>
            )}
          </div>

          {userId !== user.id && (
            <div className="w-full mt-auto" onClick={(e) => e.stopPropagation()}>
              <FollowButton
                targetUserId={user.id}
                initialIsFollowing={user.isFollowing ?? false}
                className="w-full"
              />
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
