import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { SITE_NAME, SITE_URL } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif-face" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "Grant Hunter: an AI agent that finds grants, bounties and hackathons for you",
  description: "Grant Hunter searches the web daily for grants, bounties, hackathons and creator contests, checks the terms against the source, scores each one against your profile and drafts your application. Powered by NVIDIA Nemotron on Nebius Token Factory and Tavily.",
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: "Grant Hunter: let grants, bounties and hackathons find you",
    description: "A personal AI agent that hunts opportunities that fit you, checks every fact against its source and drafts the application for you to approve.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grant Hunter: let grants, bounties and hackathons find you",
    description: "A personal AI agent that hunts opportunities that fit you, checks every fact against its source and drafts the application for you to approve.",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f7f9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${serif.variable} ${mono.variable}`}>
      <body className={`min-h-dvh bg-night font-sans text-fg antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
