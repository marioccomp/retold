"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo-full.svg";
import profilePic from "@/assets/foto.jpeg";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export default function Header() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const userImage = profilePic.src; // TODO: substituir por session?.user?.image
  const userName = session?.user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleProfileClick = () => {
    console.log("clicou")
    router.push(`/${session?.user?.username}`);
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
          <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
            Explorar
          </Button>
          <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
            Sobre
          </Button>
        </nav>

        {/* Profile / Login */}
        <div className="flex items-center gap-4">
          {status === "authenticated" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#05dc7f] focus:ring-offset-2 transition-all cursor-pointer">
                  <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-[#05dc7f]/50 transition-all">
                    {userImage ? (
                      <AvatarImage src={userImage} alt={userName} />
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
                    {session?.user?.email}
                  </p>
                </div>
                <DropdownMenuItem className="cursor-pointer gap-2 py-2" onClick={handleProfileClick}>
                  <FiUser className="h-4 w-4 text-gray-500" />
                  <span >Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer gap-2 py-2 w-full flex items-center">
                    <FiSettings className="h-4 w-4 text-gray-500" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <FiLogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button className="bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-medium px-5 h-9 rounded-full transition-all hover:shadow-[0_0_15px_-3px_rgba(5,220,127,0.4)] active:scale-[0.98] cursor-pointer">
                Entrar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
