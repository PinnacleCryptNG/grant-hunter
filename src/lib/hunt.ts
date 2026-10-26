import { one, query } from "./db";
import { extractOpportunity } from "./extract";
import { chatJson } from "./llm";
import { loadMemory } from "./memory";
import { scoreOpportunity } from "./score";
import { tavilyExtract, tavilySearch, type TavilyResult } from "./tavily";
import type { Extracted, Profile } from "./types";
import { getProfile } from "./user";

export type HuntQuery = { query: string; includeDomains?: string[]; excludeDomains?: string[]; timeRange?: "week" | "month" | "year"; source: string };

export type HuntStats = {
  queries: number;
  results: number;
  newPages: number;
  extracted: number;
  skippedListing: number;
  skippedClosed: number;
  scored: number;
  errors: string[];
  ms: number;
};

/** Social feeds and video sites rarely contain verifiable terms; X is searched separately. */
const NOISY_DOMAINS = ["instagram.com", "facebook.com", "tiktok.com", "youtube.com", "linkedin.com", "pinterest.com", "threads.net"];

const SOURCES: { source: string; domains: string[]; timeRange?: HuntQuery["timeRange"]; build: (p: Profile) => string }[] = [
  // Listing sites keep pages live until the deadline, so no recency filter there.
  { source: "Superteam Earn", domains: ["earn.superteam.fun"], build: (p) => `Superteam Earn listing bounty ${p.skills.slice(0, 2).join(" ")}` },
  { source: "Devpost", domains: ["devpost.com"], build: (p) => `online hackathon open for submissions ${p.interests[0] ?? "AI"} prizes` },
  { source: "Gitcoin", domains: ["gitcoin.co", "grants.gitcoin.co", "explorer.gitcoin.co"], timeRange: "month", build: () => "Gitcoin grants round open applications" },
  { source: "X announcements", domains: ["x.com", "twitter.com"], timeRange: "month", build: (p) => `announcing grant program OR bounty OR hackathon ${p.ecosystems.slice(0, 2).join(" OR ")} apply` },
  { source: "Ecosystem grants", domains: [], timeRange: "month", build: (p) => `${p.ecosystems[0] ?? "open source"} ecosystem grants program apply now ${new Date().getFullYear()}` },
  { source: "Creator contests", domains: [], timeRange: "month", build: (p) => `creator contest open submissions prize ${p.interests.slice(0, 2).join(" ")} ${new Date().getFullYear()}` },
];

export function baseQueries(p: Profile): HuntQuery[] {
  return SOURCES.map((s) => ({
    source: s.source,
    query: s.build(p),
    includeDomains: s.domains.length ? s.domains : undefined,
    excludeDomains: s.domains.length ? undefined : NOISY_DOMAINS,
    timeRange: s.timeRange,
  }));
}

/** Skip pages that are clearly not an opportunity's own page (galleries, forums, profiles). */
export function isCandidateUrl(u: string) {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname;
    if (NOISY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return false;
    // Devpost hackathons live on their own subdomain; devpost.com itself is listings and profiles.
    if (host === "devpost.com") return false;
    if (host.endsWith(".devpost.com")) return !/^\/(project-gallery|forum_topics|submissions|participants|updates)\b/.test(path);
    if (host === "earn.superteam.fun") return /^\/listings?\//.test(path);
    return true;
  } catch {
    return false;
  }
}

/** Take the best results from each query in turn so one noisy source cannot crowd out the rest. */
export function roundRobin<T extends { score: number; q: HuntQuery }>(items: T[], limit: number) {
  const groups = new Map<string, T[]>();
  for (const it of items) groups.set(it.q.query, [...(groups.get(it.q.query) ?? []), it]);
  const queues = [...groups.values()].map((g) => g.sort((a, b) => b.score - a.score));
  const out: T[] = [];
  while (out.length < limit && queues.some((q) => q.length)) for (const q of queues) if (q.length && out.length < limit) out.push(q.shift()!);
  return out;
}

/** Nemotron Nano plans extra profile-specific searches on top of the fixed sources. */
async function plannedQueries(p: Profile): Promise<HuntQuery[]> {
  try {
    const { data } = await chatJson<{ queries: string[] }>({
      model: "nano",
      maxTokens: 400,
      temperature: 0.4,
      system: "You write web search queries that find currently OPEN grants, bounties, hackathons and creator contests for one person. Return JSON {\"queries\": [3 short search queries]}.",
      user: `Year: ${new Date().getFullYear()}. Skills: ${p.skills.join(", ")}. Ecosystems: ${p.ecosystems.join(", ")}. Interests: ${p.interests.join(", ")}. Country: ${p.country}.`,
    });
    return (data.queries ?? []).filter((q) => typeof q === "string").slice(0, 3).map((q) => ({ query: q, source: "Agent-planned", excludeDomains: NOISY_DOMAINS, timeRange: "month" as const }));
  } catch {
    return [];
  }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          out[idx] = { status: "fulfilled", value: await fn(items[idx]) };
        } catch (reason) {
          out[idx] = { status: "rejected", reason };
        }
      }
    }),
  );
  return out;
}

export function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) if (/^utm_|^ref(_|$)|^s$|^t$/.test(k)) url.searchParams.delete(k);
    return url.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

function sourceFor(url: string, fallback: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.includes("superteam")) return "Superteam Earn";
  if (host.includes("devpost")) return "Devpost";
  if (host.includes("gitcoin")) return "Gitcoin";
  if (host === "x.com" || host === "twitter.com") return "X";
  return fallback === "Agent-planned" || fallback === "Ecosystem grants" || fallback === "Creator contests" ? host : fallback;
}

export async function scoreForUser(userId: string, opportunityId: number, extracted: Extracted, profile?: Profile) {
  const p = profile ?? (await getProfile(userId));
  const memory = await loadMemory(userId);
  const { scoring, model } = await scoreOpportunity(extracted, p, memory);
  await query(
    `INSERT INTO user_opportunities (user_id, opportunity_id, score, scoring, model, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id, opportunity_id) DO UPDATE SET score = EXCLUDED.score, scoring = EXCLUDED.scoring, model = EXCLUDED.model, updated_at = now()`,
    [userId, opportunityId, scoring.score, JSON.stringify(scoring), model],
  );
  return scoring;
}

export async function runHunt(userId: string, trigger: "manual" | "schedule", opts: { maxNew?: number } = {}) {
  const started = Date.now();
  const maxNew = opts.maxNew ?? 10;
  const profile = await getProfile(userId);
  const stats: HuntStats = { queries: 0, results: 0, newPages: 0, extracted: 0, skippedListing: 0, skippedClosed: 0, scored: 0, errors: [], ms: 0 };

  const queries = [...baseQueries(profile), ...(await plannedQueries(profile))];
  stats.queries = queries.length;
  const searched = await pool(queries, 5, async (q) => {
    const results = await tavilySearch({ query: q.query, includeDomains: q.includeDomains, excludeDomains: q.excludeDomains, maxResults: 5, timeRange: q.timeRange });
    return results.map((r) => ({ ...r, q }));
  });

  const byUrl = new Map<string, TavilyResult & { q: HuntQuery }>();
  for (const s of searched) {
    if (s.status === "rejected") {
      stats.errors.push(String(s.reason).slice(0, 200));
      continue;
    }
    for (const r of s.value) {
      if (!isCandidateUrl(r.url)) continue;
      const url = normalizeUrl(r.url);
      const prev = byUrl.get(url);
      if (!prev || r.score > prev.score) byUrl.set(url, { ...r, url });
    }
  }
  stats.results = byUrl.size;

  const urls = [...byUrl.keys()];
  const known = urls.length
    ? await query<{ id: number; url: string; extracted: Extracted }>("SELECT id, url, extracted FROM opportunities WHERE url = ANY($1)", [urls])
    : [];
  const knownUrls = new Set(known.map((k) => k.url));
  const scoredAlready = new Set(
    (await query<{ opportunity_id: number }>("SELECT opportunity_id FROM user_opportunities WHERE user_id = $1", [userId])).map((r) => r.opportunity_id),
  );

  const fresh = roundRobin([...byUrl.values()].filter((r) => !knownUrls.has(r.url)), maxNew);
  stats.newPages = fresh.length;

  const needText = fresh.filter((r) => !r.raw_content || r.raw_content.length < 400).map((r) => r.url);
  if (needText.length) {
    try {
      for (const e of await tavilyExtract(needText.slice(0, 20))) {
        const r = byUrl.get(normalizeUrl(e.url));
        if (r) r.raw_content = e.raw_content;
      }
    } catch (e) {
      stats.errors.push(String(e).slice(0, 200));
    }
  }

  const toScore: { id: number; extracted: Extracted }[] = known
    .filter((k) => !scoredAlready.has(k.id) && k.extracted.isSingleOpportunity && k.extracted.openStatus !== "closed")
    .map((k) => ({ id: k.id, extracted: k.extracted }));

  const extractedResults = await pool(fresh, 4, async (r) => {
    const { extracted, model } = await extractOpportunity({ url: r.url, title: r.title, text: r.raw_content || r.content });
    stats.extracted++;
    const row = await one<{ id: number }>(
      `INSERT INTO opportunities (url, title, source, kind, snippet, extracted, deadline_at, found_by_query, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (url) DO UPDATE SET extracted = EXCLUDED.extracted, updated_at = now() RETURNING id`,
      [r.url, extracted.title.slice(0, 300), sourceFor(r.url, r.q.source), extracted.kind, r.content?.slice(0, 600) ?? null, JSON.stringify(extracted), extracted.deadlineIso, r.q.query, model],
    );
    if (!extracted.isSingleOpportunity) stats.skippedListing++;
    else if (extracted.openStatus === "closed") stats.skippedClosed++;
    else if (row) toScore.push({ id: row.id, extracted });
  });
  for (const e of extractedResults) if (e.status === "rejected") stats.errors.push(String(e.reason).slice(0, 200));

  const scoredResults = await pool(toScore, 4, async (o) => {
    await scoreForUser(userId, o.id, o.extracted, profile);
    stats.scored++;
  });
  for (const e of scoredResults) if (e.status === "rejected") stats.errors.push(String(e.reason).slice(0, 200));

  stats.ms = Date.now() - started;
  stats.errors = stats.errors.slice(0, 10);
  await query("INSERT INTO hunts (user_id, trigger, queries, stats) VALUES ($1, $2, $3, $4)", [userId, trigger, JSON.stringify(queries), JSON.stringify(stats)]);
  await query("INSERT INTO events (user_id, action, note) VALUES ($1, 'hunt', $2)", [userId, `${stats.scored} scored from ${stats.results} results`]);
  return { stats, queries };
}
