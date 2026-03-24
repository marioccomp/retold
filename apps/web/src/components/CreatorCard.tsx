"use client";

import { FiGithub, FiTwitter, FiLinkedin, FiGlobe } from "react-icons/fi";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

interface CreatorCardProps {
  name: string;
  handle: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  links?: {
    github?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    website?: string | null;
  };
}

export default function CreatorCard({ name, handle, role, bio, avatarUrl, links }: CreatorCardProps) {
  return (
    <Link href={`/${handle}`} className="block h-full no-underline">
      <div
        className="relative group bg-card border border-border/50 rounded-3xl p-8 flex flex-col h-full 
                   transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                   hover:-translate-y-3 hover:scale-[1.01] hover:border-primary/40 
                   hover:shadow-[0_25px_50px_-12px_rgba(5,220,127,0.2)] 
                   backdrop-blur-sm cursor-pointer"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary/20 p-1 bg-background shadow-lg transition-transform group-hover:scale-105 duration-200">
              <AvatarImage src={avatarUrl} alt={name} className="rounded-full object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex gap-1">
            {links?.github && (
              <a 
                href={links.github} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <FiGithub size={18} />
              </a>
            )}
            {links?.linkedin && (
              <a 
                href={links.linkedin} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <FiLinkedin size={18} />
              </a>
            )}
            {links?.website && (
              <a 
                href={links.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <FiGlobe size={18} />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors duration-200">{name}</h3>
          <p className="text-sm font-bold text-primary/80">@{handle}</p>
        </div>

        <div className="inline-block self-start px-3 py-1 rounded-full bg-primary/5 border border-primary/10 mb-4 transition-colors group-hover:bg-primary/10">
          <span className="text-xs font-black text-primary tracking-wider uppercase">{role}</span>
        </div>

        <p className="text-foreground/70 leading-relaxed text-sm flex-grow mb-6 antialiased">
          {bio}
        </p>

        <div className="mt-auto pt-6 border-t border-border/40 flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Retold Core Team</p>
          <div className="flex -space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-6 h-6 rounded-full bg-primary/20 blur-sm animate-pulse" />
            <div className="w-4 h-4 rounded-full bg-primary/30 blur-md animate-pulse delay-75" />
          </div>
        </div>
      </div>
    </Link>
  );
}
