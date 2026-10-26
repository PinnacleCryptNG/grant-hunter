import { one, query } from "./db";
import { chatJson } from "./llm";
import { isActive, listOpportunities } from "./opportunities";
import { getProfile } from "./user";

export type Digest = {
  day: string;
  headline: string;
  items: { id: number; title: string; score: number | null; deadline: string | null; why: string; nextStep: string }[];
  model: string | null;
  generatedAt: string;
};

export function dayIn(tz: string, d = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Rank by fit, with a boost for deadlines in the next 7 days so nothing urgent is missed. */
export function topFive<T extends { score: number | null; deadline_at: string | null }>(items: T[]) {
  const now = Date.now();
  const rank = (o: T) => {
    const s = o.score ?? 0;
    if (!o.deadline_at) return s;
    const days = (new Date(o.deadline_at).getTime() - now) / 86400000;
    return s + (days <= 7 ? 8 : days <= 14 ? 4 : 0);
  };
  return [...items].sort((a, b) => rank(b) - rank(a)).slice(0, 5);
}

export async function getDigest(userId: string, { regenerate = false } = {}): Promise<Digest | null> {
  const profile = await getProfile(userId);
  const day = dayIn(profile.timezone);
  if (!regenerate) {
    const cached = await one<{ content: Digest }>("SELECT content FROM digests WHERE user_id = $1 AND day = $2", [userId, day]);
    if (cached) return cached.content;
  }
  const all = (await listOpportunities(userId)).filter((o) => isActive(o) && o.status !== "rejected" && o.status !== "applied");
  const top = topFive(all);
  if (top.length === 0) return null;

  const brief = top.map((o) => ({
    id: o.id,
    title: o.title,
    score: o.score,
    reward: o.extracted.reward.value,
    deadline: o.deadline_at ?? "unknown",
    verdict: o.scoring?.verdict,
    risks: o.scoring?.risks?.map((r) => r.label),
    howToApply: o.extracted.howToApply.value,
  }));
  let headline = `Your top ${top.length} for today`;
  let notes: Record<number, { why: string; nextStep: string }> = {};
  let model: string | null = null;
  try {
    const res = await chatJson<{ headline: string; items: { id: number; why: string; nextStep: string }[] }>({
      model: "super",
      maxTokens: 1000,
      temperature: 0.3,
      system: `Write a short daily digest for ${profile.name || "the user"}. For each opportunity give one sentence "why" (fit + urgency) and one concrete "nextStep". Use only the given data. Return JSON {"headline": string (max 12 words), "items": [{"id": number, "why": string, "nextStep": string}]}.`,
      user: `TODAY: ${day} (${profile.timezone})\n${JSON.stringify(brief)}`,
    });
    headline = res.data.headline || headline;
    notes = Object.fromEntries((res.data.items ?? []).map((i) => [i.id, i]));
    model = res.model;
  } catch {
    // Fall back to the verdicts already produced at scoring time.
  }
  const digest: Digest = {
    day,
    headline,
    items: top.map((o) => ({
      id: o.id,
      title: o.title,
      score: o.score,
      deadline: o.deadline_at,
      why: notes[o.id]?.why ?? o.scoring?.verdict ?? "",
      nextStep: notes[o.id]?.nextStep ?? "Open the details and draft an application.",
    })),
    model,
    generatedAt: new Date().toISOString(),
  };
  await query(
    `INSERT INTO digests (user_id, day, content, model) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, day) DO UPDATE SET content = EXCLUDED.content, model = EXCLUDED.model, created_at = now()`,
    [userId, day, JSON.stringify(digest), model],
  );
  return digest;
}
