export type Profile = {
  name: string;
  headline: string;
  bio: string;
  skills: string[];
  ecosystems: string[];
  interests: string[];
  links: { label: string; url: string }[];
  portfolio: { title: string; url: string; description: string }[];
  country: string;
  timezone: string;
  hourlyRateUsd: number | null;
  minRewardUsd: number | null;
  preferredPayout: string[];
  avoid: string[];
  huntSchedule: "daily" | "off";
};

export type OpportunityKind = "grant" | "bounty" | "hackathon" | "contest" | "other" | "unknown";

/** A value pulled from the page. `value` is "unknown" when the page does not state it. */
export type Field = { value: string; evidence: string | null };

export type Extracted = {
  isSingleOpportunity: boolean;
  title: string;
  organizer: Field;
  kind: OpportunityKind;
  summary: string;
  reward: Field;
  rewardUsdEstimate: number | null;
  deadline: Field;
  deadlineIso: string | null;
  deadlineTimezone: string;
  eligibility: Field;
  eligibleCountries: Field;
  payoutMethod: Field;
  paidInSponsorToken: "yes" | "no" | "unknown";
  entryFee: Field;
  howToApply: Field;
  requiredSkills: string[];
  openStatus: "open" | "closed" | "upcoming" | "unknown";
  unknownFields: string[];
};

export type Risk = { code: string; label: string; severity: "high" | "medium" | "low"; detail: string };

export type Scoring = {
  score: number;
  verdict: string;
  reasons: { type: "plus" | "minus"; text: string }[];
  risks: Risk[];
};

export type Status = "new" | "saved" | "applied" | "rejected";

export type OpportunityRow = {
  id: number;
  url: string;
  title: string;
  source: string;
  kind: OpportunityKind;
  snippet: string | null;
  extracted: Extracted;
  deadline_at: string | null;
  found_by_query: string | null;
  checked_at?: string | null;
  recheck_note?: string | null;
  model: string | null;
  created_at: string;
  score: number | null;
  scoring: Scoring | null;
  status: Status;
  feedback: string | null;
  scoring_model: string | null;
};
