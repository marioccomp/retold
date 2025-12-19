import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "../components/Header";
import "./globals.css";
import ProjectCard from "../components/ProjectCard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Header />
        {/* <ProjectCard /> */}

        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}
