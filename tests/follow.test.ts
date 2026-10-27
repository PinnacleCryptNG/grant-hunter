import { describe, expect, it } from "vitest";
import { isCandidateUrl, listingLinks } from "@/lib/hunt";

const page = `
# Open bounties
[Home](https://superteam.fun/earn) [Login](/earn/login) [Blog](https://superteam.fun/blog/x)
- [Write a thread on Solana Pay](https://superteam.fun/earn/listing/solana-pay-thread) $500 USDC
- [Build a Telegram bot](/earn/listing/tg-bot?utm_source=x) $1,000
- [Write a thread on Solana Pay](https://superteam.fun/earn/listing/solana-pay-thread)
- [Our sponsor](https://example.com/about)
- [Some image](https://superteam.fun/earn/cover.png)
`;

describe("listingLinks", () => {
  it("keeps individual listings and drops nav, images and duplicates", () => {
    expect(listingLinks("https://superteam.fun/earn", page)).toEqual([
      "https://superteam.fun/earn/listing/solana-pay-thread",
      "https://superteam.fun/earn/listing/tg-bot",
    ]);
  });

  it("follows Devpost hackathon subdomains from a listing", () => {
    const md = "[AI Agents Hackathon](https://ai-agents.devpost.com/) [Gallery](https://ai-agents.devpost.com/project-gallery) [Devpost](https://devpost.com/hackathons)";
    expect(listingLinks("https://devpost.com/c/ai", md)).toEqual(["https://ai-agents.devpost.com"]);
  });

  it("caps the number of links", () => {
    const md = Array.from({ length: 10 }, (_, i) => `[Grant ${i}](https://x.org/grants/g${i})`).join(" ");
    expect(listingLinks("https://x.org/grants", md, 3)).toHaveLength(3);
  });
});

describe("isCandidateUrl forums", () => {
  it("drops governance forum threads", () => {
    expect(isCandidateUrl("https://gov.gitcoin.co/t/proposal-update-quorum/123")).toBe(false);
    expect(isCandidateUrl("https://forum.near.org/t/grants-update/1")).toBe(false);
    expect(isCandidateUrl("https://esp.ethereum.foundation/applicants")).toBe(true);
  });
});
