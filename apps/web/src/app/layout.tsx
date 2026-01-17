import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import Header from "../components/Header";
import AuthProvider from "../providers/auth";
import { QueryProvider } from "../providers/QueryProvider";
import { Toaster } from "sonner";

import "./globals.css";
import ProjectCard from "../components/ProjectCard";
import { auth } from "../domains/auth/auth";

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
  return (
    <html lang="en" className={questrial.variable}>
      <body className={`${questrial.className} antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <QueryProvider>
            <Header session={session} />
            <main className="flex-grow w-full">{children}</main>
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
