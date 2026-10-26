import { describe, expect, it } from "vitest";
import { isCandidateUrl, normalizeUrl, roundRobin } from "@/lib/hunt";
import { topFive } from "@/lib/digest";

describe("hunt URL handling", () => {
  it("strips tracking params and trailing slashes", () => {
    expect(normalizeUrl("https://a.devpost.com/?ref_feature=challenge&ref_medium=discover&utm_source=x")).toBe("https://a.devpost.com");
    expect(normalizeUrl("https://earn.superteam.fun/listing/foo/?ref=bar#top")).toBe("https://earn.superteam.fun/listing/foo");
  });
  it("keeps opportunity pages and drops galleries, forums and social feeds", () => {
    expect(isCandidateUrl("https://graph-hacks.devpost.com")).toBe(true);
    expect(isCandidateUrl("https://la-ai.devpost.com/project-gallery?page=2")).toBe(false);
    expect(isCandidateUrl("https://devpost.com/hackathons")).toBe(false);
    expect(isCandidateUrl("https://earn.superteam.fun/listing/some-bounty")).toBe(true);
    expect(isCandidateUrl("https://earn.superteam.fun/")).toBe(false);
    expect(isCandidateUrl("https://www.instagram.com/p/abc")).toBe(false);
  });
  it("round-robins across queries so every source is represented", () => {
    const q = (query: string) => ({ query, source: query });
    const items = [
      ...[0.9, 0.8, 0.7, 0.6].map((score) => ({ score, q: q("generic") })),
      { score: 0.3, q: q("superteam") },
      { score: 0.2, q: q("devpost") },
    ];
    const picked = roundRobin(items, 3).map((i) => i.q.query);
    expect(picked.sort()).toEqual(["devpost", "generic", "superteam"]);
  });
});

describe("digest ranking", () => {
  it("boosts deadlines inside a week and returns at most five", () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const items = [
      { id: 1, score: 80, deadline_at: null },
      { id: 2, score: 75, deadline_at: soon },
      ...[3, 4, 5, 6].map((id) => ({ id, score: 50, deadline_at: null })),
    ];
    const top = topFive(items);
    expect(top).toHaveLength(5);
    expect(top[0].id).toBe(2);
  });
});
