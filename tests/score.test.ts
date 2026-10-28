import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm", () => ({ chatJson: vi.fn(async () => ({ data: { score: 95, verdict: "Great", reasons: [], risks: [] }, model: "nemotron-test" })) }));

import { ruleRisks, scoreOpportunity } from "@/lib/score";
import { EMPTY_PROFILE } from "@/lib/profile";

const PROFILE = { ...EMPTY_PROFILE, name: "Test User", skills: ["TypeScript"], country: "Kenya" };
import type { Extracted } from "@/lib/types";

const U = { value: "unknown", evidence: null };
const base: Extracted = {
  isSingleOpportunity: true,
  title: "Test",
  organizer: U,
  kind: "bounty",
  summary: "",
  reward: { value: "$500", evidence: "$500" },
  rewardUsdEstimate: 500,
  deadline: { value: "Dec 1", evidence: "Dec 1" },
  deadlineIso: "2099-12-01T00:00:00.000Z",
  deadlineTimezone: "UTC",
  eligibility: { value: "Anyone", evidence: "Anyone" },
  eligibleCountries: U,
  payoutMethod: { value: "USDC", evidence: "USDC" },
  paidInSponsorToken: "no",
  entryFee: U,
  howToApply: U,
  requiredSkills: [],
  openStatus: "open",
  unknownFields: ["organizer", "eligibleCountries", "entryFee", "howToApply"],
};
const codes = (x: Partial<Extracted>) => ruleRisks({ ...base, ...x }, PROFILE).map((r) => r.code);
const memory = { liked: [], rejected: [], applied: [] };

describe("ruleRisks", () => {
  it("has no flags for clear, free, stablecoin terms", () => expect(codes({})).toEqual([]));
  it("flags sponsor-token payouts", () => expect(codes({ paidInSponsorToken: "yes" })).toContain("sponsor_token"));
  it("flags entry fees but not 'free'", () => {
    expect(codes({ entryFee: { value: "$25 registration fee", evidence: "x" } })).toContain("entry_fee");
    expect(codes({ entryFee: { value: "Free to enter", evidence: "x" } })).not.toContain("entry_fee");
  });
  it("flags unclear terms when critical fields are unknown", () =>
    expect(codes({ unknownFields: ["reward", "deadline", "payoutMethod"] })).toContain("unclear_terms"));
  it("flags the user's country when excluded", () =>
    expect(codes({ eligibleCountries: { value: `Worldwide, except ${PROFILE.country}`, evidence: "x" } })).toContain("country"));
});

describe("scoreOpportunity", () => {
  it("caps the model's score when a high-severity rule fires", async () => {
    const { scoring } = await scoreOpportunity({ ...base, entryFee: { value: "$50 entry fee", evidence: "x" } }, PROFILE, memory);
    expect(scoring.score).toBeLessThanOrEqual(60);
    expect(scoring.risks.map((r) => r.code)).toContain("entry_fee");
  });
  it("caps closed opportunities near zero", async () => {
    const { scoring } = await scoreOpportunity({ ...base, openStatus: "closed" }, PROFILE, memory);
    expect(scoring.score).toBeLessThanOrEqual(5);
  });
});
