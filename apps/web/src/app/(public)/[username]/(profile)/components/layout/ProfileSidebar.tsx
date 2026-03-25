"use client";

import { memo, useMemo } from "react";
import {
  FiGithub,
  FiLinkedin,
  FiCamera,
  FiGlobe,
  FiMail,
  FiCopy,
  FiSend,
  FiCheck,
} from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { useTranslation } from "@/src/i18n/client";
import { FollowButton } from "@/src/components/FollowButton";
import { NetworkModal } from "@/src/components/NetworkModal";
import { useState } from "react";
import { followsMeAction } from "../../../_actions/follows-me.action";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";

const SocialLinkItem = memo(function SocialLinkItem({
  type,
  url,
  Icon,
  ownProfile,
  onAddClick,
  addTooltip,
}: {
  type: "github" | "linkedin" | "website";
  url: string | null;
  Icon: typeof FiGithub;
  ownProfile?: boolean;
  onAddClick?: () => void;
  addTooltip?: string;
}) {
  const isEmpty = !url || url.trim() === "";

  // If empty and not profile owner, hide the icon completely
  if (isEmpty && !ownProfile) return null;

  // If empty but is profile owner, show faded/placeholder state
  if (isEmpty && ownProfile) {
    return (
      <li>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddClick}
          title={addTooltip}
          className="w-[42px] h-[42px] border border-dashed border-border/60 rounded-[10px] bg-background/50 text-muted-foreground opacity-50 hover:opacity-80 hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
        >
          <Icon size={18} />
        </Button>
      </li>
    );
  }

  return (
    <li>
      <Button
        variant="ghost"
        size="icon"
        asChild
        className="w-[42px] h-[42px] border border-border rounded-[10px] bg-card text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
      >
        <a
          href={url ?? ""}
          target="_blank"
          rel="noopener noreferrer ugc"
          title={type === "github" ? "GitHub" : type === "linkedin" ? "LinkedIn" : "Website"}
        >
          <Icon size={18} />
        </a>
      </Button>
    </li>
  );
});

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  onEditClick: () => void;
};

export default function ProfileSidebar({ profile, ownProfile, onEditClick }: Props) {
  const { dict } = useTranslation();
  const [networkModal, setNetworkModal] = useState<{
    isOpen: boolean;
    type: "followers" | "following" | null;
  }>({
    isOpen: false,
    type: null,
  });

  const stats = useMemo(() => {
    const totalViews = profile.projects.reduce((acc, p) => acc + (p.views || 0), 0);
    const totalLikes = profile.projects.reduce((acc, p) => acc + (p.likes || 0), 0);

    return {
      views: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews,
      likes: totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}k` : totalLikes,
    };
  }, [profile.projects]);

  const { data: followsMe } = useQuery<boolean>({
    queryKey: ["followsMe", profile.id],
    queryFn: async () => {
      const res = await followsMeAction(profile.id);
      return res.success ? (res.data ?? false) : false;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    refetchOnWindowFocus: false, // Não atualiza ao focar na janela
    enabled: !ownProfile,
  });

  return (
    <aside className="flex flex-col items-center w-full">
      <div className="-mt-20 sm:-mt-[100px] md:-mt-[110px] lg:-mt-[135px] flex flex-col items-center">
        <div
          className={`relative group ${ownProfile ? "cursor-pointer" : ""}`}
          onClick={ownProfile ? onEditClick : undefined}
        >
          <Avatar className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[190px] md:h-[190px] lg:w-[230px] lg:h-[230px] border-4 border-background shadow-xl bg-card">
            <AvatarImage
              src={profile.image ?? undefined}
              alt={dict.profile.alt_avatar}
              className="object-cover"
            />
            <AvatarFallback className="text-4xl font-bold text-foreground">
              {(profile.name || profile.username || "U").charAt(0)}
            </AvatarFallback>
          </Avatar>

          {ownProfile && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-4 border-white/20">
              <FiCamera className="text-white mb-2" size={32} />
              <span className="text-white text-xs font-semibold uppercase tracking-wider">
                {dict.profile.change_photo}
              </span>
            </div>
          )}

          {!ownProfile && followsMe && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border shadow-sm rounded-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary/10 text-primary">
                  <FiCheck size={10} strokeWidth={4} />
                </div>
                <span className="text-[10px] font-bold text-foreground tracking-[0.05em] uppercase whitespace-nowrap">
                  {dict.profile.follows_you}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-xl font-bold text-foreground flex items-center gap-2">
          <span>{profile.name}</span>
        </div>
      </div>

      <section className="mt-3 w-full max-w-[300px] md:max-w-full flex flex-col gap-4 items-center">
        {/* Title */}
        <div className="w-full rounded-2xl py-5 px-6 text-center border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="inline-block px-2 pb-1 border-b-2 border-primary/20 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black opacity-80">
              {dict.profile.edit_modal.job_label}
            </span>
          </div>
          <h3 className="m-0 break-words font-black text-[1.15rem] text-foreground tracking-tight leading-tight">
            {profile.title || (
              <span className="text-muted-foreground/60 font-medium text-sm normal-case">
                {dict.profile.no_title}
              </span>
            )}
          </h3>
        </div>

        {/* Description/Bio */}
        <div className="w-full rounded-2xl p-6 text-center border border-primary/10 bg-gradient-to-br from-card via-card to-primary/[0.05] shadow-sm relative overflow-hidden group/bio transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.02]">
          <Quote className="absolute -top-1 -left-1 text-primary/10 w-12 h-12 -rotate-12 transition-transform group-hover/bio:scale-110 duration-500" />
          <p className="m-0 text-[0.95rem] text-foreground/90 leading-relaxed font-semibold antialiased relative z-10">
            {profile.bio ? (
              <span>{profile.bio}</span>
            ) : (
              <span className="text-muted-foreground/50 font-medium text-sm">
                {dict.profile.no_description}
              </span>
            )}
          </p>
          <Quote className="absolute -bottom-1 -right-1 text-primary/10 w-12 h-12 rotate-[168deg] transition-transform group-hover/bio:scale-110 duration-500" />
        </div>

        {/* Stats */}
        <div className="w-full flex border border-border rounded-2xl overflow-hidden bg-card shadow-sm transition-all duration-300 hover:shadow-md">
          <p className="flex-1 m-0 py-4 text-center text-[0.85rem] text-muted-foreground font-medium tracking-tight">
            <span className="block text-[1.2rem] font-black text-foreground">{stats.views}</span>{" "}
            {dict.profile.views}
          </p>
          <p className="flex-1 m-0 py-4 text-center text-[0.85rem] text-muted-foreground border-l border-border font-medium tracking-tight">
            <span className="block text-[1.2rem] font-black text-foreground">{stats.likes}</span>{" "}
            {dict.profile.likes}
          </p>
        </div>

        {/* Followers/Following Stats */}
        <div className="w-full flex border border-border rounded-2xl overflow-hidden bg-card shadow-sm transition-all duration-300 hover:shadow-md">
          <button
            onClick={() => setNetworkModal({ isOpen: true, type: "followers" })}
            className="flex-1 m-0 py-4 text-center text-[0.85rem] text-muted-foreground font-medium hover:bg-muted/50 transition-colors bg-transparent cursor-pointer border-none outline-none tracking-tight"
          >
            <span className="block text-[1.2rem] font-black text-foreground">
              {profile.followersCount}
            </span>{" "}
            {dict.profile.followers}
          </button>
          <button
            onClick={() => setNetworkModal({ isOpen: true, type: "following" })}
            className="flex-1 m-0 py-4 text-center text-[0.85rem] text-muted-foreground border-y-0 border-r-0 border-l border-border font-medium hover:bg-muted/50 transition-colors bg-transparent cursor-pointer outline-none tracking-tight"
          >
            <span className="block text-[1.2rem] font-black text-foreground">
              {profile.followingCount}
            </span>{" "}
            {dict.profile.following}
          </button>
        </div>

        {/* Social Links */}
        <ul className="flex flex-wrap items-center justify-center gap-3 p-0 m-0 list-none w-full">
          <SocialLinkItem
            type="github"
            url={profile.githubUrl}
            Icon={FiGithub}
            ownProfile={ownProfile}
            onAddClick={onEditClick}
            addTooltip={dict.profile.social_links?.add_github}
          />
          <SocialLinkItem
            type="linkedin"
            url={profile.linkedinUrl}
            Icon={FiLinkedin}
            ownProfile={ownProfile}
            onAddClick={onEditClick}
            addTooltip={dict.profile.social_links?.add_linkedin}
          />
          <SocialLinkItem
            type="website"
            url={profile.websiteUrl}
            Icon={FiGlobe}
            ownProfile={ownProfile}
            onAddClick={onEditClick}
            addTooltip={dict.profile.social_links?.add_website}
          />
        </ul>

        {/* Action Button */}
        <div className="w-full flex flex-col gap-3">
          {!ownProfile && (
            <FollowButton
              targetUserId={profile.id}
              initialIsFollowing={profile.isFollowing}
              className="w-full h-11 text-base font-bold rounded-xl"
            />
          )}

          {ownProfile && (
            <Button
              onClick={onEditClick}
              className="w-full h-11 border-none rounded-xl bg-primary text-primary-foreground text-base font-bold cursor-pointer transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2"
            >
              {dict.profile.edit_profile}
            </Button>
          )}
        </div>
      </section>

      <NetworkModal
        isOpen={networkModal.isOpen}
        onClose={() => setNetworkModal({ ...networkModal, isOpen: false })}
        userId={profile.id}
        type={networkModal.type}
      />
    </aside>
  );
}
