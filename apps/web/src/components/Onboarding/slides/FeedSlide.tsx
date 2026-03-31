"use client";

import { useTranslation } from "@/src/i18n/client";
import OnboardingSlide from "../OnboardingSlide";
import { FiSearch, FiFilter, FiHash } from "react-icons/fi";
import OnboardingProjectCard from "../OnboardingProjectCard";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import imgEscalonador from "@/assets/mockup-escalonador.jpg";

import { useQuery } from "@tanstack/react-query";
import { getFeedProjects } from "@/src/app/(public)/(feed)/actions/get-feed-projects.action";

export default function FeedSlide() {
  const { dict } = useTranslation();

  const { data: feedData } = useQuery({
    queryKey: ["onboarding-projects"],
    queryFn: () => getFeedProjects(1, 20, "", "recommended"),
  });

  // Filter for projects with images and not private (though feed already returns public only)
  const dynamicProjects = feedData?.projects
    ?.filter((p) => p.images && p.images.length > 0)
    .slice(0, 2);

  const mockProjects: ProjectCardDTO[] = [
    {
      id: 1,
      title: dict.onboarding.create.mock_title_input || "Simulador de Escalonamento",
      description:
        dict.onboarding.create.mock_description || "Simulador de processos com algoritmos...",
      status: "DONE",
      visibility: "public",
      images: [imgEscalonador.src],
      likes: 12,
      views: 45,
      commentsCount: 3,
      hasLiked: false,
      tags: [
        { id: 1, name: "JavaScript" },
        { id: 2, name: "Next.js" },
      ],
      createdAt: new Date().toISOString(),
      ownerName: "Mario Junior",
      ownerUsername: "mariojr",
      ownerImage: "",
      ownerId: 1,
      isFollowingOwner: false,
      repositoryUrl: "https://github.com/mariojr/escalonador",
      repositoryFullName: "mariojr/escalonador",
      repositoryIsPrivate: false,
    },
    {
      id: 2,
      title: "Portfolio v2",
      description: "Site pessoal com animações GSAP e dark mode moderno.",
      status: "DONE",
      visibility: "public",
      images: [],
      likes: 8,
      views: 22,
      commentsCount: 1,
      hasLiked: false,
      tags: [
        { id: 4, name: "TypeScript" },
        { id: 5, name: "Tailwind" },
      ],
      createdAt: new Date().toISOString(),
      ownerName: "Alice Smith",
      ownerUsername: "alicesmith",
      ownerImage: "",
      ownerId: 2,
      isFollowingOwner: false,
      repositoryUrl: "https://github.com",
      repositoryFullName: "alice/portfolio",
      repositoryIsPrivate: false,
    },
    {
      id: 3,
      title: "API Gateway",
      description: "Gateway de APIs com rate-limiting e autenticação JWT",
      status: "DONE",
      visibility: "public",
      images: [],
      likes: 24,
      views: 89,
      commentsCount: 5,
      hasLiked: false,
      tags: [
        { id: 6, name: "Node.js" },
        { id: 7, name: "Express" },
        { id: 8, name: "Redis" },
      ],
      createdAt: new Date().toISOString(),
      ownerName: "Lucas Costa",
      ownerUsername: "lucascosta",
      ownerImage: "",
      ownerId: 3,
      isFollowingOwner: false,
      repositoryUrl: "https://github.com",
      repositoryFullName: "lucas/api-gateway",
      repositoryIsPrivate: false,
    },
    {
      id: 4,
      title: "E-commerce Mobile",
      description: "App de e-commerce com React Native e Stripe",
      status: "DONE",
      visibility: "public",
      images: [],
      likes: 15,
      views: 56,
      commentsCount: 2,
      hasLiked: false,
      tags: [
        { id: 9, name: "React Native" },
        { id: 10, name: "PostgreSQL" },
      ],
      createdAt: new Date().toISOString(),
      ownerName: "Rafael Bruno",
      ownerUsername: "rafaelbruno",
      ownerImage: "",
      ownerId: 4,
      isFollowingOwner: false,
      repositoryUrl: "https://github.com",
      repositoryFullName: "rafael/ecommerce-mobile",
      repositoryIsPrivate: false,
    },
  ];

  const projectsToDisplay =
    dynamicProjects && dynamicProjects.length >= 1 ? dynamicProjects : mockProjects.slice(0, 2);

  return (
    <OnboardingSlide>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-10 lg:gap-16 items-center pt-8 sm:pt-12 md:pt-16 lg:pt-0">
        {/* Left — Text */}
        <div className="flex flex-col gap-2 sm:gap-5 text-center items-center lg:text-left lg:items-start order-1 px-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit mx-auto lg:mx-0">
            <FiSearch size={14} />
            {dict.onboarding.feed.badge}
          </div>

          <h2 className="text-[1.1rem] sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            {dict.onboarding.feed.title}
          </h2>
          <p className="text-[13px] sm:text-lg text-muted-foreground leading-snug max-w-lg mx-auto lg:mx-0 mb-2 sm:mb-0">
            {dict.onboarding.feed.subtitle}
          </p>

          <ul className="hidden sm:flex flex-col gap-3 pt-2 items-center lg:items-start mx-auto lg:mx-0">
            {[
              { icon: FiSearch, text: dict.onboarding.feed.feature_search },
              { icon: FiFilter, text: dict.onboarding.feed.feature_filter },
              { icon: FiHash, text: dict.onboarding.feed.feature_tags },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground w-fit">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="text-primary" size={16} />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Real feed replica (Desktop) or Single Card (Mobile) */}
        <div className="relative order-2 w-full max-w-[900px] mx-auto pointer-events-none select-none">
          {/* Desktop Replica */}
          <div className="hidden lg:flex onboarding-glass p-0 bg-background border border-border rounded-xl shadow-lg flex-col items-center overflow-hidden">
            {/* 1. Centered Search Bar */}
            <div className="w-full px-8 pt-10 pb-6">
              <div className="w-full max-w-[500px] mx-auto relative text-base">
                <FiSearch
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <Input
                  readOnly
                  placeholder={dict.onboarding.feed.search_placeholder}
                  className="w-full py-4 pl-14 pr-6 rounded-full text-base bg-background border border-border shadow-sm placeholder:text-muted-foreground font-medium h-[52px]"
                />
              </div>
            </div>

            {/* 2. Custom Tabs mock without Shadcn's default styling overhead */}
            <div className="w-full flex flex-col items-center">
              <div className="flex bg-transparent p-0  h-auto gap-12 z-10 items-center justify-center">
                <div className="py-3 px-1 text-sm font-bold text-foreground border-b-2 border-primary">
                  {dict.onboarding.feed.tab_projects}
                </div>
                <div className="py-3 px-1 text-sm font-medium text-muted-foreground border-b-2 border-transparent">
                  {dict.onboarding.feed.tab_people}
                </div>
              </div>
              {/* Full-width divider */}
              <div className="w-full h-px bg-border/50" />
            </div>

            {/* 3. Sort box aligned to LEFT (Below Divider) */}
            <div className="w-full px-8 py-5 flex justify-start">
              <Select defaultValue="recommended">
                <SelectTrigger className="w-[160px] h-10 text-xs bg-background border-border rounded-md shadow-sm outline-none ring-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">{dict.feed.sort.recommended}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Responsive Grid of actual ProjectCards — natural height */}
            <div className="w-full px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6 m-0 p-0 ring-0 pb-2">
                {projectsToDisplay.slice(0, 2).map((project) => (
                  <OnboardingProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          </div>

          {/* Tablet & Mobile View */}
          <div className="lg:hidden w-full max-w-[500px] md:max-w-[700px] mx-auto pb-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-background border border-border rounded-xl shadow-xl overflow-hidden onboarding-feed-card scale-[0.9] sm:scale-100 origin-top">
                <OnboardingProjectCard project={projectsToDisplay[0]} />
              </div>
              {/* Show second card on tablet and above */}
              <div className="hidden md:block bg-background border border-border rounded-xl shadow-xl overflow-hidden onboarding-feed-card">
                <OnboardingProjectCard project={projectsToDisplay[1] || projectsToDisplay[0]} />
              </div>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(circle_at_60%_40%,oklch(0.79_0.17_150_/_0.08),transparent_60%)] blur-2xl -z-20" />
        </div>
      </div>
    </OnboardingSlide>
  );
}
