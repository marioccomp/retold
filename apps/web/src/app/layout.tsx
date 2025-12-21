import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import Header from "../components/Header";
import AuthProvider from "../providers/auth";

import "./globals.css";
import ProjectCard from "../components/ProjectCard";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

export const metadata: Metadata = {
  title: "Retold",
  description: "Reimagine your stories.", // ajustar dps
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={questrial.variable}>
      <body className={`${questrial.className} antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <Header />
          <main className="flex-grow">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
