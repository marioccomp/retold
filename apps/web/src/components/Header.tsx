"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo-full.svg";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FiUser, FiSettings, FiLogOut, FiSearch } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Session } from "next-auth";
import { useTranslation } from "../i18n/client";
import { useQuery } from "@tanstack/react-query";
import { getMeAction } from "@/src/domains/user/actions/get-me";
import { useSearch } from "../providers/SearchContext";

export default function Header({ session: initialSession }: { session: Session | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { dict } = useTranslation();

  // State for scroll detection and search
  const { searchQuery, setSearchQuery, activeTab, setActiveTab } = useSearch();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); // Mobile

  const scrollToContent = () => {
    const element = document.getElementById("feed-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle scroll to show/hide search bar in header
  useEffect(() => {
    const handleScroll = () => {
      const isProjectOpen = !!searchParams.get("project");

      // Only show the search bar in the header on the home/feed page and when no project is open
      if (pathname !== "/" || isProjectOpen) {
        setShowSearch(false);
        setIsScrolled(window.scrollY > 20);
        return;
      }

      // Tenta encontrar a barra de pesquisa do feed
      const feedSearch = document.getElementById("feed-search-container");

      let shouldShow = false;

      if (feedSearch) {
        const rect = feedSearch.getBoundingClientRect();
        // Só mostra no header quando a barra do feed sair totalmente da tela
        shouldShow = rect.bottom < 20;
      } else {
        // Fallback caso a barra não exista por algum motivo
        shouldShow = window.scrollY > 400;
      }

      setIsScrolled(window.scrollY > 20);
      setShowSearch(shouldShow);
    };

    handleScroll(); // Check initial state
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, isSearchFocused, searchParams]);

  // React Query para buscar dados frescos do usuário
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getMeAction(),
    enabled: !!(session?.user || initialSession?.user), // Só busca se estiver logado
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  // Une os dados priorizando o que for preenchido
  const userData = {
    ...(initialSession?.user || {}),
    ...(session?.user || {}),
    ...(currentUser || {}),
  } as any;

  // Se o React Query tiver dados velhos (null), mas a sessão já tiver o dado novo, use o da sessão
  if (!userData.username && session?.user?.username) userData.username = session.user.username;
  if (!userData.name && session?.user?.name) userData.name = session.user.name;
  if (!userData.email && session?.user?.email) userData.email = session.user.email;
  if (!userData.image && session?.user?.image) userData.image = session.user.image;

  const status = session?.user || initialSession?.user ? "authenticated" : "unauthenticated";

  const userImage = userData?.image;
  const userName = userData?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleProfileClick = () => {
    if (userData?.username) {
      router.push(`/${userData.username}`);
    } else {
      // Caso ainda não tenha username (ex: logo após login Git), tenta buscar da sessão
      const currentUsername = session?.user?.username || initialSession?.user?.username;
      if (currentUsername) {
        router.push(`/${currentUsername}`);
      }
    }
  };

  const handleExploreClick = () => {
    if (pathname === "/") {
      document.getElementById("feed-content")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#feed-content");
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 border-b border-black/5 ${
        isScrolled
          ? "bg-white shadow-sm"
          : "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      }`}
    >
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center cursor-pointer shrink-0">
            <Image
              src={logo}
              alt="Retold Logo"
              className="h-30 md:h-30 w-auto cursor-pointer"
              priority
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
              onClick={handleExploreClick}
            >
              {dict.header.explore}
            </Button>
            <Button
              variant="ghost"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            >
              {dict.header.about}
            </Button>
          </nav>
        </div>

        {/* Center Search Bar (Desktop) */}
        <div
          className={`hidden md:flex flex-1 max-w-2xl items-center gap-6 transition-all duration-500 ease-in-out transform ${
            showSearch || isSearchFocused
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          {/* Feed Tabs - Only visible on Home/Feed */}
          {pathname === "/" && (
            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-full border border-black/5">
              <button
                onClick={() => {
                  setActiveTab("projects");
                  scrollToContent();
                }}
                className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === "projects"
                    ? "bg-white text-[#152e2b] shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {dict.feed?.feedcontent?.tabs?.projects || "Projects"}
              </button>
              <button
                onClick={() => {
                  setActiveTab("people");
                  scrollToContent();
                }}
                className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === "people"
                    ? "bg-white text-[#152e2b] shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {dict.feed?.feedcontent?.tabs?.people || "People"}
              </button>
            </div>
          )}

          <div className="relative w-full max-w-xs group">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#05dc7f] transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder={dict.feed?.feedcontent?.search_placeholder || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full h-10 pl-10 pr-4 bg-gray-100/50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-[#05dc7f] focus:ring-4 focus:ring-[#05dc7f]/10 rounded-full text-sm transition-all outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Profile / Actions / Mobile Search */}
        <div className="flex items-center gap-3 pl-2">
          {/* Mobile Search Icon */}
          <div
            className={`md:hidden transition-all duration-300 ${showSearch || isSearchExpanded ? "opacity-100" : "opacity-0 scale-90 pointer-events-none"}`}
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gray-100 text-gray-600 h-9 w-9"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            >
              <FiSearch size={22} />
            </Button>
          </div>

          {status === "authenticated" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-full focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 cursor-pointer border-none bg-transparent p-0 shadow-none">
                  <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity shadow-none">
                    {userImage ? (
                      <AvatarImage src={userImage} alt={userName} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-[#05dc7f]/10 text-[#047857] text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 mt-2"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                </div>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 py-2"
                  onClick={handleProfileClick}
                >
                  <FiUser className="h-4 w-4 text-gray-500" />
                  <span>{dict.header.profile}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="cursor-pointer gap-2 py-2 w-full flex items-center"
                  >
                    <FiSettings className="h-4 w-4 text-gray-500" />
                    <span>{dict.header.settings}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <FiLogOut className="h-4 w-4" />
                  <span>{dict.header.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button className="bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-medium px-5 h-9 rounded-full transition-all hover:shadow-[0_0_15px_-3px_rgba(5,220,127,0.4)] active:scale-[0.98] cursor-pointer">
                {dict.header.login}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 p-4 transition-all duration-300 origin-top shadow-xl ${
          isSearchExpanded && (showSearch || isSearchFocused)
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-4 w-full">
          {pathname === "/" && (
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-full">
              <button
                onClick={() => {
                  setActiveTab("projects");
                  scrollToContent();
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === "projects" ? "bg-white text-[#152e2b] shadow-sm" : "text-gray-500"
                }`}
              >
                {dict.feed?.feedcontent?.tabs?.projects || "Projects"}
              </button>
              <button
                onClick={() => {
                  setActiveTab("people");
                  scrollToContent();
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === "people" ? "bg-white text-[#152e2b] shadow-sm" : "text-gray-500"
                }`}
              >
                {dict.feed?.feedcontent?.tabs?.people || "People"}
              </button>
            </div>
          )}

          <div className="relative w-full">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={dict.feed?.feedcontent?.search_placeholder || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              autoFocus={isSearchExpanded}
              className="w-full h-12 pl-10 pr-4 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#05dc7f]/50 border-none"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
