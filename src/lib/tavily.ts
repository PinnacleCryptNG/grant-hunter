import { tavily, type TavilyClient } from "@tavily/core";
import { estimateCredits, recordCredits } from "./budget";
import { one, query } from "./db";
import { recordStep, timed } from "./trace";

export type TavilyResult = {
  url: string;
  title: string;
  content: string;
  raw_content?: string | null;
  score: number;
  published_date?: string;
};

export function tavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

let client: TavilyClient | null = null;
function tvly() {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not set");
  client ??= tavily({ apiKey: process.env.TAVILY_API_KEY, clientName: "grant-hunter" });
  return client;
}

export type SearchOpts = {
  query: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
  timeRange?: "day" | "week" | "month" | "year";
  depth?: "basic" | "advanced";
};

const HOUR = 3600;

/** Identical searches and crawls within the TTL reuse stored results instead of spending credits. */
async function cached<T extends TavilyResult[]>(key: string, ttlSec: number, op: string, label: string, fn: () => Promise<T>): Promise<T> {
  const hit = await one<{ results: T }>("SELECT results FROM tavily_cache WHERE key = $1 AND created_at > now() - make_interval(secs => $2)", [key, ttlSec]).catch(() => null);
  if (hit) {
    await recordStep({ kind: "tavily", op, ms: 0, ok: true, detail: `${label} → ${hit.results.length} results (cached, 0 credits)` });
    return hit.results;
  }
  const results = await fn();
  const slim = results.map((r) => ({ ...r, raw_content: r.raw_content?.slice(0, 40_000) ?? null }));
  await query(
    "INSERT INTO tavily_cache (key, results, created_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET results = EXCLUDED.results, created_at = now()",
    [key, JSON.stringify(slim)],
  ).catch(() => {});
  if (Math.random() < 0.05) await query("DELETE FROM tavily_cache WHERE created_at < now() - interval '8 days'").catch(() => {});
  return results;
}

export async function tavilySearch(opts: SearchOpts): Promise<TavilyResult[]> {
  const { query: q, includeDomains, excludeDomains, maxResults = 6, timeRange, depth = "advanced" } = opts;
  const key = `search:${JSON.stringify({ q, includeDomains, excludeDomains, maxResults, timeRange, depth })}`;
  return cached(key, 12 * HOUR, "search", q, () => searchUncached(q, { includeDomains, excludeDomains, maxResults, timeRange, depth }));
}

async function searchUncached(q: string, { includeDomains, excludeDomains, maxResults, timeRange, depth }: Omit<SearchOpts, "query">): Promise<TavilyResult[]> {
  const res = await timed(
    { kind: "tavily", op: "search", detail: q },
    () =>
      tvly().search(q, {
        searchDepth: depth,
        maxResults,
        includeRawContent: "markdown",
        includeUsage: true,
        ...(includeDomains?.length ? { includeDomains } : {}),
        ...(excludeDomains?.length ? { excludeDomains } : {}),
        ...(timeRange ? { timeRange } : {}),
      }),
    (r) => ({ detail: `${q} → ${r.results?.length ?? 0} results (${r.usage?.credits ?? estimateCredits("search", 1, depth)} credits)` }),
  );
  await recordCredits(res.usage?.credits ?? estimateCredits("search", 1, depth));
  return (res.results ?? []).map((r) => ({
    url: r.url,
    title: r.title,
    content: r.content,
    raw_content: r.rawContent ?? null,
    score: r.score,
    published_date: r.publishedDate,
  }));
}

export async function tavilyExtract(urls: string[]): Promise<{ url: string; raw_content: string }[]> {
  if (urls.length === 0) return [];
  const batch = urls.slice(0, 20);
  const res = await timed(
    { kind: "tavily", op: "extract", detail: `${batch.length} pages` },
    () => tvly().extract(batch, { extractDepth: "basic", format: "markdown", includeUsage: true }),
    (r) => ({ detail: `${batch.length} pages → ${r.results?.length ?? 0} read` }),
  );
  await recordCredits(res.usage?.credits ?? estimateCredits("extract", res.results?.length ?? 0));
  return (res.results ?? []).map((r) => ({ url: r.url, raw_content: r.rawContent }));
}

/** Crawls a grant hub one level deep, keeping pages that look like individual programs or funding rounds. */
export async function tavilyCrawl(url: string, instructions: string, limit = 6): Promise<TavilyResult[]> {
  // Grant hubs change slowly, so a crawl is reused for a week.
  return cached(`crawl:${JSON.stringify({ url, instructions, limit })}`, 7 * 24 * HOUR, "crawl", url, () => crawlUncached(url, instructions, limit));
}

async function crawlUncached(url: string, instructions: string, limit: number): Promise<TavilyResult[]> {
  const res = await timed(
    { kind: "tavily", op: "crawl", detail: url },
    () => tvly().crawl(url, { maxDepth: 1, limit, instructions, format: "markdown", extractDepth: "basic", timeout: 60, includeUsage: true }),
    (r) => ({ detail: `${url} → ${r.results?.length ?? 0} pages` }),
  );
  await recordCredits(res.usage?.credits ?? estimateCredits("crawl", res.results?.length ?? 0));
  return (res.results ?? [])
    .filter((r) => r.rawContent)
    .map((r) => ({ url: r.url, title: r.rawContent.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? r.url, content: r.rawContent.slice(0, 600), raw_content: r.rawContent, score: 0.5 }));
}
