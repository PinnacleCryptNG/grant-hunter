import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Grant Hunter — your personal AI agent for grants, bounties & hackathons",
  description: "Finds, verifies and scores grants, bounties, hackathons and creator contests for you, then drafts tailored applications. Powered by NVIDIA Nemotron on Nebius Token Factory and Tavily search.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-dvh bg-slate-50 font-sans text-slate-900 antialiased`}>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:pb-12">{children}</main>
      </body>
    </html>
  );
}
