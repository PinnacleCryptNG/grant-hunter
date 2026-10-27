/** Suggested values for the profile pickers. Users can still add their own. */
export const SKILL_GROUPS: Record<string, string[]> = {
  Engineering: ["TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "Rust", "Go", "Solidity", "Move", "Smart contracts", "Frontend", "Backend", "Full-stack", "Mobile", "AI / ML", "AI agents", "Data science", "DevOps", "Security auditing"],
  Design: ["UI/UX design", "Product design", "Figma", "Branding", "Illustration", "3D", "Motion design"],
  Content: ["Technical writing", "Copywriting", "Blogging", "X threads", "Video editing", "YouTube", "Short-form video", "Podcasting", "Translation", "Memes"],
  Growth: ["Community", "Marketing", "Product management", "Research", "Business development", "Events"],
};

export const ECOSYSTEMS = ["Solana", "Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "Sui", "Aptos", "NEAR", "Starknet", "Avalanche", "Cosmos", "Polkadot", "TON", "Bitcoin", "Stellar", "NVIDIA", "OpenAI", "Google", "Microsoft", "AWS", "Hugging Face"];

export const INTERESTS = ["AI agents", "DeFi", "Payments", "Stablecoins", "Consumer apps", "Gaming", "NFTs", "DePIN", "Infrastructure", "Developer tools", "Open source", "Security", "Privacy", "Education", "Social impact", "Climate", "Health", "Creator economy", "DAOs", "RWA"];

export const PAYOUTS = ["USDC", "USDT", "Bank transfer", "PayPal", "SOL", "ETH", "Sponsor token", "Gift cards"];

export const AVOID = ["Entry fees", "NFT-only prizes", "Token-only rewards", "Team required", "In-person only", "KYC required", "Unpaid / exposure only", "Very short deadlines"];

const NOT_COUNTRIES = /unknown|outlying|pseudo|european union|united nations|eurozone|world|^[A-Z]{2}$/i;

/** Every country/region name the browser knows, in English. */
export function countryNames(): string[] {
  if (typeof Intl === "undefined" || !("DisplayNames" in Intl)) return [];
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  const out = new Set<string>();
  for (let a = 65; a < 91; a++)
    for (let b = 65; b < 91; b++) {
      const code = String.fromCharCode(a, b);
      try {
        const name = dn.of(code);
        if (name && name !== code && !NOT_COUNTRIES.test(name)) out.add(name);
      } catch {}
    }
  return [...out].sort((x, y) => x.localeCompare(y));
}
