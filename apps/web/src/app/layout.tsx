import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import Header from "../components/Header";
import AuthProvider from "../providers/auth";
import { QueryProvider } from "../providers/QueryProvider";
import { Toaster } from "sonner";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  const lang = await getLocale();

  return (
    <html lang={lang} className={questrial.variable}>
      <body className={`${questrial.className} antialiased min-h-screen flex flex-col`}>
        <LanguageProvider lang={lang}>
          <AuthProvider session={session}>
            <QueryProvider>
              <Header session={session} />
              <main className="flex-grow w-full">{children}</main>
              <Toaster richColors position="top-right" />
            </QueryProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
