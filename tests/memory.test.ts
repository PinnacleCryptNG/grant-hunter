import { describe, expect, it } from "vitest";
import { grantHubsFor } from "@/lib/hunt";
import { pickEmbedModel } from "@/lib/llm";
import { cosine, embedText, nearest } from "@/lib/memory";
import { termChanges } from "@/lib/recheck";
import type { Extracted, Profile } from "@/lib/types";

const f = (value: string) => ({ value, evidence: value === "unknown" ? null : value });
const ex = (o: Partial<Extracted> = {}) =>
  ({ title: "T", kind: "bounty", summary: "Build a bot", organizer: f("Superteam"), reward: f("1,000 USDC"), deadline: f("Nov 1"), deadlineIso: "2026-11-01T00:00:00Z", openStatus: "open", requiredSkills: ["TypeScript"], ...o }) as Extracted;

describe("embedding memory", () => {
  it("computes cosine similarity", () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it("returns the closest past decisions above the threshold", () => {
    const items = [
      { title: "a", embedding: [1, 0] },
      { title: "b", embedding: [0.9, 0.1] },
      { title: "c", embedding: [0, 1] },
    ];
    expect(nearest([1, 0], items).map((x) => x.it.title)).toEqual(["a", "b"]);
  });
  it("embeds only known facts", () => {
    const t = embedText("Bot bounty", ex({ organizer: f("unknown") }));
    expect(t).toContain("Bot bounty");
    expect(t).not.toContain("unknown");
  });
  it("prefers an NVIDIA embedding model, then known ones, then any embedding model", () => {
    expect(pickEmbedModel(["nvidia/llama-embed-nemotron-8b", "BAAI/bge-en-icl"], {})).toBe("nvidia/llama-embed-nemotron-8b");
    expect(pickEmbedModel(["BAAI/bge-en-icl"], {})).toBe("BAAI/bge-en-icl");
    expect(pickEmbedModel(["x/other-embed"], {})).toBe("x/other-embed");
    expect(pickEmbedModel([], { NEBIUS_EMBED_MODEL: "m" })).toBe("m");
  });
});

describe("re-check", () => {
  it("reports closures, moved deadlines and reward changes", () => {
    expect(termChanges(ex(), ex())).toEqual([]);
    expect(termChanges(ex(), ex({ openStatus: "closed" }))).toEqual(["now closed"]);
    expect(termChanges(ex(), ex({ deadline: f("Nov 8"), deadlineIso: "2026-11-08T00:00:00Z" }))).toEqual(["deadline now Nov 8"]);
    expect(termChanges(ex(), ex({ reward: f("unknown") }))).toEqual([]);
  });
});

describe("grant hub crawl", () => {
  it("crawls hubs that match the profile's ecosystems", () => {
    const p = { ecosystems: ["Solana", "Ethereum", "Sui"] } as Profile;
    expect(grantHubsFor(p).map((h) => h.name)).toEqual(["Solana", "Ethereum"]);
    expect(grantHubsFor({ ecosystems: ["Cardano"] } as Profile)).toEqual([]);
  });
});
