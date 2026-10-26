import { chatJson } from "./llm";
import { SCORE_SCHEMA } from "./schemas";
import type { Extracted, Profile, Risk, Scoring } from "./types";

export type Memory = { liked: string[]; rejected: { title: string; note: string | null }[]; applied: string[] };

/** Deterministic red flags derived from verified fields; the model can add more but cannot remove these. */
export function ruleRisks(x: Extracted, profile: Profile): Risk[] {
  const risks: Risk[] = [];
  if (x.paidInSponsorToken === "yes")
    risks.push({ code: "sponsor_token", label: "Paid in sponsor token", severity: "medium", detail: `Payout: ${x.payoutMethod.value}. Token value can be volatile or illiquid.` });
  const fee = x.entryFee.value;
  if (fee !== "unknown" && !/\b(no|none|free|0|zero)\b/i.test(fee))
    risks.push({ code: "entry_fee", label: "Entry fee", severity: "high", detail: fee });
  const critical = ["reward", "deadline", "eligibility", "payoutMethod"].filter((f) => x.unknownFields.includes(f));
  if (critical.length >= 2)
    risks.push({ code: "unclear_terms", label: "Unclear terms", severity: critical.length >= 3 ? "high" : "medium", detail: `Not stated on the page: ${critical.join(", ")}.` });
  if (x.openStatus === "closed")
    risks.push({ code: "closed", label: "Closed / deadline passed", severity: "high", detail: x.deadline.value });
  const countries = x.eligibleCountries.value;
  if (countries !== "unknown" && profile.country) {
    const c = profile.country.toLowerCase();
    const excluded = new RegExp(`(exclud|not (open|available|eligible)|except|restricted)[^.]*${c}`, "i").test(countries);
    if (excluded) risks.push({ code: "country", label: `${profile.country} may not be eligible`, severity: "high", detail: countries });
  }
  return risks;
}

function profileBrief(p: Profile) {
  return JSON.stringify({
    headline: p.headline,
    bio: p.bio,
    skills: p.skills,
    ecosystems: p.ecosystems,
    interests: p.interests,
    country: p.country,
    hourlyRateUsd: p.hourlyRateUsd,
    minRewardUsd: p.minRewardUsd,
    preferredPayout: p.preferredPayout,
    avoid: p.avoid,
    portfolio: p.portfolio.map((x) => `${x.title}: ${x.description}`),
  });
}

function memoryBrief(m: Memory) {
  return JSON.stringify({
    liked_or_saved: m.liked.slice(0, 10),
    applied: m.applied.slice(0, 10),
    rejected: m.rejected.slice(0, 10).map((r) => (r.note ? `${r.title} (reason: ${r.note})` : r.title)),
  });
}

function opportunityBrief(x: Extracted) {
  const f = (k: keyof Extracted) => (x[k] as { value: string }).value;
  return JSON.stringify({
    title: x.title,
    kind: x.kind,
    summary: x.summary,
    organizer: f("organizer"),
    reward: f("reward"),
    rewardUsdEstimate: x.rewardUsdEstimate,
    deadline: x.deadlineIso ?? "unknown",
    eligibility: f("eligibility"),
    eligibleCountries: f("eligibleCountries"),
    payoutMethod: f("payoutMethod"),
    paidInSponsorToken: x.paidInSponsorToken,
    entryFee: f("entryFee"),
    requiredSkills: x.requiredSkills,
    openStatus: x.openStatus,
    unknownFields: x.unknownFields,
  });
}

const SYSTEM = `You are the scoring module of Grant Hunter, a personal agent that finds grants, bounties, hackathons and contests for one user.
Score how good a fit the opportunity is for this user from 0 to 100.
Consider: skill/ecosystem match, reward vs the user's minimum reward and hourly rate, payout method vs preferences, country eligibility, time left, clarity of terms, and the user's memory (things they liked, applied to, or rejected and why). Penalise opportunities similar to rejected ones.
Treat "unknown" fields as unknown: do not assume they are favourable. Never invent facts.
Flag extra risks only when supported by the data: country_not_eligible, sponsor_token, entry_fee, unclear_terms, low_reward, skill_gap, short_deadline.
Return JSON: {"score": integer 0-100, "verdict": string (one sentence), "reasons": [{"type":"plus"|"minus","text": string}] (3-6 items), "risks": [{"code": string, "label": string, "severity": "high"|"medium"|"low", "detail": string}]}`;

export async function scoreOpportunity(x: Extracted, profile: Profile, memory: Memory) {
  const now = new Date().toISOString();
  const { data, model } = await chatJson<Scoring>({
    model: "super",
    op: "score",
    schema: SCORE_SCHEMA,
    maxTokens: 1200,
    temperature: 0.1,
    system: SYSTEM,
    user: `NOW: ${now}\nUSER PROFILE: ${profileBrief(profile)}\nUSER MEMORY: ${memoryBrief(memory)}\nOPPORTUNITY (verified fields): ${opportunityBrief(x)}`,
  });
  const rules = ruleRisks(x, profile);
  const modelRisks = Array.isArray(data.risks) ? data.risks.filter((r) => r && typeof r.label === "string") : [];
  const seen = new Set(rules.map((r) => r.code));
  const risks = [...rules, ...modelRisks.filter((r) => !seen.has(r.code) && !(r.code === "country_not_eligible" && seen.has("country")))];
  let score = Math.round(Math.max(0, Math.min(100, Number(data.score) || 0)));
  if (x.openStatus === "closed") score = Math.min(score, 5);
  if (rules.some((r) => r.severity === "high" && r.code !== "closed")) score = Math.min(score, 60);
  const scoring: Scoring = {
    score,
    verdict: typeof data.verdict === "string" ? data.verdict : "",
    reasons: Array.isArray(data.reasons) ? data.reasons.filter((r) => r && typeof r.text === "string").slice(0, 6) : [],
    risks: risks.slice(0, 8),
  };
  return { scoring, model };
}

export { profileBrief, memoryBrief, opportunityBrief };
