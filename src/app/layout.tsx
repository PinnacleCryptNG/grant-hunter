import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face" });

export const metadata: Metadata = {
  title: "Grant Hunter: an AI agent that finds grants, bounties and hackathons for you",
  description: "Grant Hunter searches the web daily for grants, bounties, hackathons and creator contests, checks the terms against the source, scores each one against your profile and drafts your application. Powered by NVIDIA Nemotron on Nebius Token Factory and Tavily.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f7f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} min-h-dvh bg-paper font-sans text-ink antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
