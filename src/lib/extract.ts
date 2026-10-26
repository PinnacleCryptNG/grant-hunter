import { chatJson } from "./llm";
import type { Extracted, Field } from "./types";

const FIELD_KEYS = ["organizer", "reward", "deadline", "eligibility", "eligibleCountries", "payoutMethod", "entryFee", "howToApply"] as const;

const SYSTEM = `You are the verification module of Grant Hunter. You read ONE web page and extract facts about a grant, bounty, hackathon or creator contest.

Rules:
- Use ONLY information stated on the page. Never guess, infer from general knowledge or invent.
- If a field is not explicitly stated, set "value" to "unknown" and "evidence" to null.
- For every non-unknown field, "evidence" must be a SHORT exact quote (max 200 chars) copied verbatim from the page that supports it.
- deadlineIso: the submission/application deadline as an ISO-8601 timestamp WITH offset (e.g. 2026-11-15T23:59:00-08:00) only if the page states a date. If the page gives a date but no time, use 23:59 in the stated timezone. If no timezone is stated, use UTC and set deadlineTimezone to "unstated". If no deadline, null.
- rewardUsdEstimate: total or top prize in USD only if the page states an amount in USD or a USD stablecoin (USDC/USDT); otherwise null.
- paidInSponsorToken: "yes" if rewards are paid in the sponsor's/project's own token, "no" if paid in fiat/USDC/USDT/ETH/SOL etc, else "unknown".
- isSingleOpportunity: false if the page is a listing/aggregator of many opportunities, a news article without application details, or unrelated.
- openStatus: "closed" if the page says it ended/closed or the deadline has passed relative to TODAY.
- unknownFields: list the field names whose value is "unknown".
Return JSON only.`;

const SHAPE = `{
 "isSingleOpportunity": boolean,
 "title": string,
 "organizer": {"value": string, "evidence": string|null},
 "kind": "grant"|"bounty"|"hackathon"|"contest"|"other",
 "summary": string (1-2 sentences, factual),
 "reward": {"value": string, "evidence": string|null},
 "rewardUsdEstimate": number|null,
 "deadline": {"value": string, "evidence": string|null},
 "deadlineIso": string|null,
 "deadlineTimezone": string,
 "eligibility": {"value": string, "evidence": string|null},
 "eligibleCountries": {"value": string, "evidence": string|null},
 "payoutMethod": {"value": string, "evidence": string|null},
 "paidInSponsorToken": "yes"|"no"|"unknown",
 "entryFee": {"value": string, "evidence": string|null},
 "howToApply": {"value": string, "evidence": string|null},
 "requiredSkills": string[],
 "openStatus": "open"|"closed"|"upcoming"|"unknown",
 "unknownFields": string[]
}`;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[*_`#>\[\]()|]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** A quote counts as grounded if it, or most of its words in order, appear in the page. */
function grounded(evidence: string, pageNorm: string) {
  const ev = norm(evidence);
  if (!ev) return false;
  if (pageNorm.includes(ev)) return true;
  const words = ev.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return false;
  const hits = words.filter((w) => pageNorm.includes(w)).length;
  return hits / words.length >= 0.8;
}

const UNKNOWN: Field = { value: "unknown", evidence: null };

function cleanField(f: unknown): Field {
  if (!f || typeof f !== "object") return UNKNOWN;
  const { value, evidence } = f as Field;
  if (typeof value !== "string" || !value.trim() || /^(unknown|n\/a|not (stated|specified|mentioned))$/i.test(value.trim())) return UNKNOWN;
  return { value: value.trim(), evidence: typeof evidence === "string" ? evidence.trim() : null };
}

export async function extractOpportunity(page: { url: string; title: string; text: string }) {
  const text = page.text.slice(0, 14000);
  const today = new Date().toISOString().slice(0, 10);
  const { data, model } = await chatJson<Partial<Extracted>>({
    model: "nano",
    maxTokens: 1800,
    temperature: 0,
    system: SYSTEM,
    user: `TODAY: ${today}\nURL: ${page.url}\nPAGE TITLE: ${page.title}\n\nReturn JSON with exactly this shape:\n${SHAPE}\n\nPAGE CONTENT:\n"""\n${text}\n"""`,
  });

  const pageNorm = norm(`${page.title} ${text}`);
  const out = { ...data } as Extracted;
  const unknown = new Set<string>();
  for (const key of FIELD_KEYS) {
    let f = cleanField(data[key]);
    // Verification: drop any value whose quoted evidence is not on the page.
    if (f.value !== "unknown" && (!f.evidence || !grounded(f.evidence, pageNorm))) f = UNKNOWN;
    out[key] = f;
    if (f.value === "unknown") unknown.add(key);
  }
  out.title = (typeof data.title === "string" && data.title.trim()) || page.title;
  out.summary = typeof data.summary === "string" ? data.summary : "";
  out.kind = (["grant", "bounty", "hackathon", "contest", "other"] as const).includes(data.kind as never) ? (data.kind as Extracted["kind"]) : "unknown";
  out.requiredSkills = Array.isArray(data.requiredSkills) ? data.requiredSkills.filter((s) => typeof s === "string").slice(0, 12) : [];
  out.paidInSponsorToken = data.paidInSponsorToken === "yes" || data.paidInSponsorToken === "no" ? data.paidInSponsorToken : "unknown";
  out.openStatus = (["open", "closed", "upcoming"] as const).includes(data.openStatus as never) ? (data.openStatus as Extracted["openStatus"]) : "unknown";
  out.isSingleOpportunity = data.isSingleOpportunity !== false;

  const iso = typeof data.deadlineIso === "string" ? data.deadlineIso : null;
  const parsed = iso ? new Date(iso) : null;
  out.deadlineIso = out.deadline.value !== "unknown" && parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : null;
  out.deadlineTimezone = out.deadlineIso ? (typeof data.deadlineTimezone === "string" ? data.deadlineTimezone : "unstated") : "unknown";
  if (!out.deadlineIso) unknown.add("deadline");
  if (out.deadlineIso && new Date(out.deadlineIso).getTime() < Date.now()) out.openStatus = "closed";

  const usd = typeof data.rewardUsdEstimate === "number" && isFinite(data.rewardUsdEstimate) ? data.rewardUsdEstimate : null;
  out.rewardUsdEstimate = out.reward.value !== "unknown" && usd !== null && usd > 0 ? usd : null;
  out.unknownFields = [...unknown];
  return { extracted: out, model };
}
