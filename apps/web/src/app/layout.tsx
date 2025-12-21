import type { Metadata } from "next";
import { Geist, Geist_Mono, Questrial } from "next/font/google";
import Header from "../components/Header";

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
        <Header />

        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}
