"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo-full.svg";
import logoDark from "@/assets/logo-full-dark.svg";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function Footer() {
  const { dict } = useTranslation();
  const currentYear = new Date().getFullYear();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="w-full border-t border-border bg-background backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo and Copyright */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link
              href="/"
              className="flex items-center opacity-80 hover:opacity-100 transition-opacity"
            >
              <Image
                src={mounted && resolvedTheme === "dark" ? logoDark : logo}
                alt="Retold Logo"
                className="h-20 w-auto transition-all duration-300"
              />
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              {dict.footer.rights.replace("{year}", String(currentYear))}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center md:justify-end gap-x-2 gap-y-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
            >
              <Link href="/terms">{dict.footer.terms}</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
            >
              <Link href="/privacy">{dict.footer.privacy}</Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => {
                navigator.clipboard.writeText("contato@retold.com.br");
                toast.success(dict.footer.email_copied);
              }}
            >
              contato@retold.com.br
            </Button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
