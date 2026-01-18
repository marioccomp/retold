"use client";

import { memo } from "react";
import { FiGithub, FiLinkedin, FiCamera } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { useTranslation } from "@/src/i18n/client";
import ownerPic from "@/assets/foto.jpeg";

const SocialLinkItem = memo(function SocialLinkItem({
    type,
    url,
    Icon,
}: {
    type: "github" | "linkedin";
    url: string | null;
    Icon: typeof FiGithub;
}) {
    if (!url) return null;

    return (
        <li>
            <Button
                variant="ghost"
                size="icon"
                asChild
                className="w-[42px] h-[42px] border border-[#e7eae9] rounded-[10px] bg-white text-[#152e2b] hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[rgba(5,220,127,0.06)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(5,220,127,0.2)] transition-all cursor-pointer"
            >
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={type === "github" ? "GitHub" : "LinkedIn"}
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

    return (
        <aside className="flex flex-col items-center w-full md:pl-0 lg:pl-12">
            <div className="-mt-20 sm:-mt-[100px] md:-mt-[110px] lg:-mt-[135px] flex flex-col items-center">
                <div className="relative">
                    <Avatar className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[190px] md:h-[190px] lg:w-[230px] lg:h-[230px] border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.08)] bg-white">
                        <AvatarImage
                            src={ownerPic.src}
                            alt={dict.profile.alt_avatar}
                            className="object-cover"
                        />
                        <AvatarFallback className="text-4xl font-bold text-[#152e2b]">
                            {(profile.name || profile.username || "U").charAt(0)}
                        </AvatarFallback>
                    </Avatar>

                    {ownProfile && (
                        <Button
                            size="icon"
                            className="absolute bottom-3 right-3 w-9 h-9 rounded-full border-none bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] hover:scale-105 hover:shadow-[0_6px_16px_rgba(5,220,127,0.4)] transition-all duration-200 cursor-pointer"
                            title={dict.profile.change_photo}
                            onClick={() => { }}
                        >
                            <FiCamera />
                        </Button>
                    )}
                </div>

                <div className="mt-3 text-xl font-bold text-[#152e2b]">
                    <span>{profile.name}</span>
                </div>
            </div>

            <section className="mt-3 w-full max-w-[300px] md:max-w-full flex flex-col gap-4 items-center">
                {/* Title */}
                <div className="w-full rounded-xl p-4 text-center border border-[#e7eae9] bg-white shadow-sm overflow-hidden">
                    <h3 className="m-0 break-all overflow-wrap-anywhere inline-block font-semibold text-[#152e2b]">
                        {profile.title || (
                            <span className="text-[#a0aaa8] italic font-normal text-sm">{dict.profile.no_title}</span>
                        )}
                    </h3>
                </div>

                {/* Description/Bio */}
                <div className="w-full rounded-xl p-4 text-center border border-[#e7eae9] bg-white shadow-sm">
                    <p className="m-0 text-[0.95rem] text-[#6b7c7a] leading-relaxed font-medium">
                        {profile.bio || (
                            <span className="text-[#a0aaa8] italic text-sm">{dict.profile.no_description}</span>
                        )}
                    </p>
                </div>

                {/* Social Links */}
                <ul className="flex flex-wrap items-center justify-center gap-3 p-0 m-0 list-none w-full">
                    <SocialLinkItem
                        type="github"
                        url={profile.githubUrl}
                        Icon={FiGithub}
                    />
                    <SocialLinkItem
                        type="linkedin"
                        url={profile.linkedinUrl}
                        Icon={FiLinkedin}
                    />
                </ul>

                {/* Stats */}
                <div className="w-full flex border border-[#e7eae9] rounded-xl overflow-hidden bg-white shadow-sm">
                    <p className="flex-1 m-0 py-3 text-center text-[0.9rem] text-[#6b7c7a] font-medium">
                        <span className="block text-[1.1rem] font-bold text-[#152e2b]">12.5k</span> {dict.profile.views}
                    </p>
                    <p className="flex-1 m-0 py-3 text-center text-[0.9rem] text-[#6b7c7a] border-l border-[#e7eae9] font-medium">
                        <span className="block text-[1.1rem] font-bold text-[#152e2b]">482</span> {dict.profile.likes}
                    </p>
                </div>

                {/* Action Button */}
                {ownProfile ? (
                    <Button
                        onClick={onEditClick}
                        className="w-full h-11 border-none rounded-xl bg-[#05dc7f] text-[#0f2f28] text-base font-bold cursor-pointer transition-all duration-200 hover:bg-[#03c56f] hover:shadow-lg hover:shadow-[#05dc7f]/20 flex items-center justify-center gap-2"
                    >
                        {dict.profile.edit_profile}
                    </Button>
                ) : (
                    <Button className="w-full h-11 border-none rounded-xl bg-[#05dc7f] text-[#0f2f28] text-base font-bold cursor-pointer transition-all duration-200 hover:bg-[#03c56f] hover:shadow-lg hover:shadow-[#05dc7f]/20">
                        {dict.profile.contact}
                    </Button>
                )}
            </section>
        </aside>
    );
}
