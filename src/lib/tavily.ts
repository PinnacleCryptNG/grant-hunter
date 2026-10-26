import { tavily, type TavilyClient } from "@tavily/core";
import { timed } from "./trace";

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
};

export async function tavilySearch({ query, includeDomains, excludeDomains, maxResults = 6, timeRange }: SearchOpts): Promise<TavilyResult[]> {
  const res = await timed(
    { kind: "tavily", op: "search", detail: query },
    () =>
      tvly().search(query, {
        searchDepth: "advanced",
        maxResults,
        includeRawContent: "markdown",
        ...(includeDomains?.length ? { includeDomains } : {}),
        ...(excludeDomains?.length ? { excludeDomains } : {}),
        ...(timeRange ? { timeRange } : {}),
      }),
    (r) => ({ detail: `${query} → ${r.results?.length ?? 0} results` }),
  );
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
    () => tvly().extract(batch, { extractDepth: "basic", format: "markdown" }),
    (r) => ({ detail: `${batch.length} pages → ${r.results?.length ?? 0} read` }),
  );
  return (res.results ?? []).map((r) => ({ url: r.url, raw_content: r.rawContent }));
}
