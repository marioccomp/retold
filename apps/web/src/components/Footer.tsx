"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo-full.svg";
import { Button } from "@/components/ui/button";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-black/5 bg-white/50 backdrop-blur-sm mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Logo and Copyright */}
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <Link href="/" className="flex items-center opacity-80 hover:opacity-100 transition-opacity">
                            <Image
                                src={logo}
                                alt="Retold Logo"
                                className="h-20 w-auto transition-all duration-300"
                            />
                        </Link>
                        <p className="text-sm text-gray-500 mt-2">
                            © {currentYear} Retold. All rights reserved.
                        </p>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-wrap justify-center md:justify-end gap-x-2 gap-y-1">
                        <Button asChild variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                            <Link href="/terms">Terms of Service</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                            <Link href="/privacy">Privacy Policy</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                            <Link href="/contact">Contact</Link>
                        </Button>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
