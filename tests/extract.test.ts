import { beforeEach, describe, expect, it, vi } from "vitest";

const reply = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock("@/lib/llm", () => ({ chatJson: vi.fn(async () => ({ data: reply.data, model: "nemotron-test" })) }));

import { extractOpportunity } from "@/lib/extract";

const PAGE = {
  url: "https://example.devpost.com",
  title: "Agents Hackathon",
  text: "# Agents Hackathon\nHosted by Example Labs.\nTotal prize pool: $10,000 in USDC.\nSubmissions close on December 1, 2099 at 5pm PT.\nOpen to developers worldwide aged 18+.",
};

const field = (value: string, evidence: string | null) => ({ value, evidence });

beforeEach(() => {
  reply.data = {
    isSingleOpportunity: true,
    title: "Agents Hackathon",
    organizer: field("Example Labs", "Hosted by Example Labs."),
    kind: "hackathon",
    summary: "Build agents.",
    reward: field("$10,000 in USDC", "Total prize pool: $10,000 in USDC."),
    rewardUsdEstimate: 10000,
    deadline: field("December 1, 2099 5pm PT", "Submissions close on December 1, 2099 at 5pm PT."),
    deadlineIso: "2099-12-01T17:00:00-08:00",
    deadlineTimezone: "America/Los_Angeles",
    eligibility: field("Developers 18+", "Open to developers worldwide aged 18+."),
    eligibleCountries: field("Worldwide", "Open to developers worldwide"),
    // Hallucinated: neither quote is on the page.
    payoutMethod: field("Wire transfer within 30 days", "Winners are paid by wire within 30 days"),
    entryFee: field("Free", null),
    howToApply: field("unknown", null),
    paidInSponsorToken: "no",
    requiredSkills: ["TypeScript"],
    openStatus: "open",
    unknownFields: [],
  };
});

describe("extractOpportunity", () => {
  it("keeps fields whose evidence is on the page", async () => {
    const { extracted } = await extractOpportunity(PAGE);
    expect(extracted.reward.value).toBe("$10,000 in USDC");
    expect(extracted.rewardUsdEstimate).toBe(10000);
    expect(extracted.deadlineIso).toBe("2099-12-02T01:00:00.000Z");
    expect(extracted.organizer.value).toBe("Example Labs");
  });

  it("marks unsupported or unquoted fields unknown instead of trusting the model", async () => {
    const { extracted } = await extractOpportunity(PAGE);
    expect(extracted.payoutMethod).toEqual({ value: "unknown", evidence: null });
    expect(extracted.entryFee).toEqual({ value: "unknown", evidence: null });
    expect(extracted.unknownFields).toEqual(expect.arrayContaining(["payoutMethod", "entryFee", "howToApply"]));
    expect(extracted.unknownFields).not.toContain("reward");
  });

  it("drops the deadline and USD estimate when their source fields are unknown", async () => {
    reply.data.deadline = field("Dec 1", "this quote is not on the page at all");
    reply.data.reward = field("unknown", null);
    const { extracted } = await extractOpportunity(PAGE);
    expect(extracted.deadlineIso).toBeNull();
    expect(extracted.rewardUsdEstimate).toBeNull();
    expect(extracted.unknownFields).toEqual(expect.arrayContaining(["deadline", "reward"]));
  });

  it("marks past deadlines closed", async () => {
    const page = { ...PAGE, text: PAGE.text.replace("2099", "2020") };
    reply.data.deadline = field("December 1, 2020", "Submissions close on December 1, 2020 at 5pm PT.");
    reply.data.deadlineIso = "2020-12-01T17:00:00-08:00";
    const { extracted } = await extractOpportunity(page);
    expect(extracted.openStatus).toBe("closed");
  });
});

describe("markdownToText", async () => {
  const { markdownToText } = await import("@/lib/text");
  it("keeps link text and drops URLs, images and markup", () => {
    expect(markdownToText("[![logo](/a.svg)](/earn) [Prizes](/earn/x) | **$22,300** in cash\n### How to Submit")).toBe("Prizes $22,300 in cash\nHow to Submit");
  });
});
