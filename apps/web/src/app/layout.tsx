import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthProvider from "../providers/auth";
import { QueryProvider } from "../providers/QueryProvider";
import { Toaster } from "sonner";
import { AuthModalProvider } from "../providers/AuthModalContext";
import { SearchProvider } from "../providers/SearchContext";
import AuthModal from "../components/auth/AuthModal";
import { ThemeProvider } from "../providers/ThemeProvider";

import "./globals.css";
import { auth } from "../domains/auth/auth";
import { getLocale } from "../i18n/server";
import { LanguageProvider } from "../i18n/client";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

export const metadata: Metadata = {
  title: "Retold",
  description: "Reimagine your stories.", // ajustar dps
};

import { CookieBanner } from "../components/CookieBanner";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const lang = await getLocale();

  return (
    <html lang={lang} className={questrial.variable}>
      <body className={`${questrial.className} antialiased min-h-screen flex flex-col`}>
        <LanguageProvider lang={lang}>
          <AuthProvider session={session}>
            <AuthModalProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <QueryProvider>
                  <SearchProvider>
                    <Header session={session} />
                    <main className="flex-grow w-full">{children}</main>
                    <Footer />
                    <AuthModal />
                    <CookieBanner />
                    <Toaster
                      richColors
                      position="top-right"
                      expand={false}
                      visibleToasts={1}
                      gap={0}
                      offset={80}
                      duration={2000}
                      toastOptions={{
                        className: "sonner-toast",
                        style: {
                          background: "var(--background)",
                          color: "var(--foreground)",
                          border: "1px solid var(--border)",
                        },
                      }}
                    />
                  </SearchProvider>
                </QueryProvider>
              </ThemeProvider>
            </AuthModalProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
