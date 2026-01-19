"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo-full.svg";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FiUser, FiSettings, FiLogOut } from "react-icons/fi";
import { Session } from "next-auth";
import { useTranslation } from "../i18n/client";
import { useQuery } from "@tanstack/react-query";
import { getMeAction } from "@/src/domains/user/actions/get-me";

export default function Header({ session: initialSession }: { session: Session | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { dict } = useTranslation();

  // React Query para buscar dados frescos do usuário
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getMeAction(),
    enabled: !!(session?.user || initialSession?.user), // Só busca se estiver logado
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  // Prioriza os dados do React Query (frescos), depois a sessão do hook, depois a inicial
  const userData = currentUser || session?.user || initialSession?.user;
  const status = userData ? "authenticated" : "unauthenticated";

  const userImage = userData?.image;
  const userName = userData?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleProfileClick = () => {
    router.push(`/${userData?.username}`);
  }

  const handleExploreClick = () => {
    if (pathname === "/") {
      document.getElementById('feed-content')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/#feed-content');
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-black/5">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center cursor-pointer">
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
          <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
            {dict.header.about}
          </Button>
        </nav>

        {/* Profile / Login */}
        <div className="flex items-center gap-4">
          {status === "authenticated" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#05dc7f] focus:ring-offset-2 transition-all cursor-pointer border-none bg-transparent p-0">
                  <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-[#05dc7f]/50 transition-all">
                    {userImage ? (
                      <AvatarImage src={userImage} alt={userName} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-[#05dc7f]/10 text-[#047857] text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {userData?.email}
                  </p>
                </div>
                <DropdownMenuItem className="cursor-pointer gap-2 py-2" onClick={handleProfileClick}>
                  <FiUser className="h-4 w-4 text-gray-500" />
                  <span >{dict.header.profile}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer gap-2 py-2 w-full flex items-center">
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
    </header>
  );
}

