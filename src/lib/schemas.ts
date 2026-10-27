/** JSON Schemas for Token Factory structured output (OpenAI `response_format: json_schema`). */
export type JsonSchema = { name: string; schema: Record<string, unknown> };

const str = { type: "string" };
const field = {
  type: "object",
  additionalProperties: false,
  required: ["value", "evidence"],
  properties: { value: str, evidence: { type: ["string", "null"] } },
};

function obj(properties: Record<string, unknown>) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

export const EXTRACT_SCHEMA: JsonSchema = {
  name: "opportunity_extraction",
  schema: obj({
    isSingleOpportunity: { type: "boolean" },
    title: str,
    organizer: field,
    kind: { type: "string", enum: ["grant", "bounty", "hackathon", "contest", "other"] },
    workType: { type: "string", enum: ["build", "writing", "video", "design", "social", "research", "other"] },
    summary: str,
    reward: field,
    rewardUsdEstimate: { type: ["number", "null"] },
    deadline: field,
    deadlineIso: { type: ["string", "null"] },
    deadlineTimezone: str,
    eligibility: field,
    eligibleCountries: field,
    payoutMethod: field,
    paidInSponsorToken: { type: "string", enum: ["yes", "no", "unknown"] },
    entryFee: field,
    howToApply: field,
    requiredSkills: { type: "array", items: str },
    openStatus: { type: "string", enum: ["open", "closed", "upcoming", "unknown"] },
    unknownFields: { type: "array", items: str },
  }),
};

export const SCORE_SCHEMA: JsonSchema = {
  name: "fit_score",
  schema: obj({
    score: { type: "integer", minimum: 0, maximum: 100 },
    verdict: str,
    reasons: { type: "array", items: obj({ type: { type: "string", enum: ["plus", "minus"] }, text: str }) },
    risks: { type: "array", items: obj({ code: str, label: str, severity: { type: "string", enum: ["high", "medium", "low"] }, detail: str }) },
  }),
};

export const PLAN_SCHEMA: JsonSchema = {
  name: "search_plan",
  schema: obj({ queries: { type: "array", items: str } }),
};
