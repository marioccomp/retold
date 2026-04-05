"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/src/i18n/client";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { dict } = useTranslation();

  const hideBanner = (persistConsent: boolean) => {
    setIsVisible(false);

    if (persistConsent) {
      localStorage.setItem("cookie-consent", "true");
    }

    window.setTimeout(() => setShouldRender(false), 500);
  };

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShouldRender(true);
      window.setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const acceptCookies = () => {
    hideBanner(true);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-50 transition-all duration-500 transform ${
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-12 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-background rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border p-6 flex flex-col gap-4 relative">
        <button
          onClick={() => hideBanner(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-600"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M16 15.5v.01" />
              <path d="M12 12v.01" />
              <path d="M11 17v.01" />
              <path d="M7 13v.01" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground leading-tight">Cookies & Privacidade</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {dict.footer.cookie_banner.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={acceptCookies}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            {dict.footer.cookie_banner.accept}
          </button>
          <Link
            href="/privacy"
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground underline decoration-border underline-offset-4"
          >
            {dict.footer.cookie_banner.more_info}
          </Link>
        </div>
      </div>
    </div>
  );
}
