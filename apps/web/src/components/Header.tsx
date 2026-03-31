"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo-full.svg";
import logoDark from "@/assets/logo-full-dark.svg";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { FiUser, FiSettings, FiLogOut, FiSearch, FiMoon, FiSun, FiMenu, FiPlayCircle } from "react-icons/fi";
import { useTheme } from "next-themes";
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
import { NotificationBell } from "./NotificationBell";

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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Do not render Header on onboarding page
  if (pathname === "/onboarding") return null;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,box-shadow,border-color] duration-300 border-b border-border/40 dark:border-border ${isScrolled
          ? "bg-background shadow-sm"
          : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        }`}
    >
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center cursor-pointer shrink-0">
            <Image
              src={logo}
              alt="Retold Logo"
              className="h-30 md:h-30 w-auto cursor-pointer dark:hidden"
              priority
            />
            <Image
              src={logoDark}
              alt="Retold Logo"
              className="h-30 md:h-30 w-auto cursor-pointer hidden dark:block"
              priority
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              className="text-sm font-bold text-foreground/90 hover:text-primary hover:bg-primary/5 cursor-pointer transition-all rounded-full"
              onClick={handleExploreClick}
            >
              {dict.header.explore}
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-sm font-bold text-foreground/90 hover:text-primary hover:bg-primary/5 cursor-pointer transition-all rounded-full"
            >
              <Link href="/about">{dict.header.about}</Link>
            </Button>
          </nav>
        </div>

        {/* Center Search Bar (Desktop) */}
        <div
          className={`hidden md:flex flex-1 max-w-2xl items-center gap-6 transition-all duration-500 ease-in-out transform ${showSearch || isSearchFocused
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
        >
          {/* Feed Tabs - Only visible on Home/Feed */}
          {pathname === "/" && (
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full border border-border/5">
              <button
                onClick={() => {
                  setActiveTab("projects");
                  scrollToContent();
                }}
                className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === "projects"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/5"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {dict.feed?.feedcontent?.tabs?.projects || "Projects"}
              </button>
              <button
                onClick={() => {
                  setActiveTab("people");
                  scrollToContent();
                }}
                className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === "people"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/5"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {dict.feed?.feedcontent?.tabs?.people || "People"}
              </button>
            </div>
          )}

          <div className="relative w-full max-w-xs group">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder={dict.feed?.feedcontent?.search_placeholder || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full h-10 pl-10 pr-4 bg-muted/50 hover:bg-muted focus:bg-background border border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-full text-sm transition-all outline-none placeholder:text-muted-foreground/70"
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
              className="rounded-full hover:bg-muted text-muted-foreground h-9 w-9"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            >
              <FiSearch size={22} />
            </Button>
          </div>

          {/* Mobile Menu (About/Explore) */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted text-muted-foreground h-9 w-9 cursor-pointer"
                >
                  <FiMenu size={22} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 mt-2 p-1.5 rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-xl"
              >
                <DropdownMenuItem
                  className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary transition-all duration-200"
                  onClick={handleExploreClick}
                >
                  <span className="font-bold text-sm">{dict.header.explore}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary transition-all duration-200"
                >
                  <Link href="/onboarding" className="w-full h-full flex items-center">
                    <span className="font-bold text-sm">{dict.header.tour}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary transition-all duration-200"
                >
                  <Link href="/about" className="w-full h-full flex items-center">
                    <span className="font-bold text-sm">{dict.header.about}</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {status === "authenticated" ? (
            <div className="flex items-center gap-4">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <button className="relative rounded-full focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 cursor-pointer border-none bg-transparent p-0 shadow-none">
                  <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity shadow-none">
                    {userImage ? (
                      <AvatarImage src={userImage} alt={userName} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 mt-2 p-1.5 rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-xl"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-sm font-medium text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userData?.email}</p>
                </div>
                <DropdownMenuItem
                  className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary dark:focus:bg-primary/20 dark:focus:text-primary transition-all duration-200 group"
                  onClick={handleProfileClick}
                >
                  <FiUser className="h-4 w-4 hover:text-primary transition-colors" />
                  <span className="font-bold text-sm">{dict.header.profile}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/onboarding"
                    className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary dark:focus:bg-primary/20 dark:focus:text-primary transition-all duration-200 group w-full flex items-center"
                  >
                    <FiPlayCircle className="h-4 w-4 hover:text-primary transition-colors" />
                    <span className="font-bold text-sm">{dict.header.tour}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary dark:focus:bg-primary/20 dark:focus:text-primary transition-all duration-200 group w-full flex items-center"
                  >
                    <FiSettings className="h-4 w-4 hover:text-primary transition-colors" />
                    <span className="font-bold text-sm">{dict.header.settings}</span>
                  </Link>
                </DropdownMenuItem>
                {mounted && (
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center justify-between gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary dark:focus:bg-primary/20 dark:focus:text-primary transition-all duration-200 group"
                    onSelect={(e) => {
                      e.preventDefault();
                      setTheme(resolvedTheme === "dark" ? "light" : "dark");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {resolvedTheme === "dark" ? (
                        <FiMoon className="h-4 w-4 hover:text-primary transition-colors" />
                      ) : (
                        <FiSun className="h-4 w-4 hover:text-primary transition-colors" />
                      )}
                      <span className="font-bold text-sm">Dark Mode</span>
                    </div>
                    <Switch checked={resolvedTheme === "dark"} className="pointer-events-none" />
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="opacity-50" />
                <DropdownMenuItem
                  className="cursor-pointer gap-3 py-3 px-3 rounded-lg focus:bg-primary/5 focus:text-primary dark:focus:bg-primary/20 dark:focus:text-primary transition-all duration-200 group mt-1"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <FiLogOut className="h-4 w-4 hover:text-primary transition-colors" />
                  <span className="font-bold text-sm">{dict.header.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          ) : (
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 h-9 rounded-full transition-all hover:shadow-[0_0_15px_-3px_rgba(var(--primary),0.4)] active:scale-[0.98] cursor-pointer">
                {dict.header.login}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-background border-b border-border/50 p-4 transition-all duration-300 origin-top shadow-xl ${isSearchExpanded && (showSearch || isSearchFocused)
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-0 pointer-events-none"
          }`}
      >
        <div className="flex flex-col gap-4 w-full">
          {pathname === "/" && (
            <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl w-full">
              <button
                onClick={() => {
                  setActiveTab("projects");
                  scrollToContent();
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === "projects"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                  }`}
              >
                {dict.feed?.feedcontent?.tabs?.projects || "Projects"}
              </button>
              <button
                onClick={() => {
                  setActiveTab("people");
                  scrollToContent();
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === "people"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                  }`}
              >
                {dict.feed?.feedcontent?.tabs?.people || "People"}
              </button>
            </div>
          )}

          <div className="relative w-full">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
              className="w-full h-12 pl-10 pr-4 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
