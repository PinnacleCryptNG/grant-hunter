import type { Profile } from "./types";

export const DEMO_USER_ID = "demo";

export const DEMO_PROFILE: Profile = {
  name: "Ada Okafor",
  headline: "Full-stack & smart-contract developer, technical writer",
  bio: "Lagos-based builder shipping TypeScript, Rust and Solana programs. I've won two hackathon tracks, maintain a small open-source wallet toolkit, and write developer tutorials. Looking for grants, bounties and hackathons where I can ship fast and get paid in stablecoins or fiat.",
  skills: ["TypeScript", "React", "Next.js", "Rust", "Solana", "Anchor", "Python", "AI agents", "Technical writing", "UI design"],
  ecosystems: ["Solana", "Ethereum", "Base", "NVIDIA", "Open-source AI"],
  interests: ["AI agents", "payments", "developer tooling", "accessibility", "creator economy"],
  links: [
    { label: "GitHub", url: "https://github.com/PinnacleCryptNG" },
    { label: "X", url: "https://x.com/" },
  ],
  portfolio: [
    { title: "WAYMARK", url: "https://github.com/PinnacleCryptNG/waymark", description: "Voice-first accessible banking prototype for blind users with voiceprint-secured payments (Python, SpeechBrain, Whisper)." },
    { title: "Wallet toolkit", url: "https://github.com/PinnacleCryptNG", description: "Open-source TypeScript helpers for Solana wallet onboarding, 400+ weekly downloads." },
    { title: "Grant Hunter", url: "https://github.com/PinnacleCryptNG/grant-hunter", description: "Personal AI agent that finds, verifies and drafts applications for grants and bounties." },
  ],
  country: "Nigeria",
  timezone: "Africa/Lagos",
  hourlyRateUsd: 45,
  minRewardUsd: 300,
  preferredPayout: ["USDC", "Bank transfer", "PayPal"],
  avoid: ["Entry fees", "Paid only in unlisted tokens"],
  huntSchedule: "daily",
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  headline: "",
  bio: "",
  skills: [],
  ecosystems: [],
  interests: [],
  links: [],
  portfolio: [],
  country: "",
  timezone: "UTC",
  hourlyRateUsd: null,
  minRewardUsd: null,
  preferredPayout: [],
  avoid: [],
  huntSchedule: "daily",
};
