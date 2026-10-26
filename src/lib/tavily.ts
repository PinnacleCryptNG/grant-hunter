import { tavily, type TavilyClient } from "@tavily/core";

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
  const res = await tvly().search(query, {
    searchDepth: "advanced",
    maxResults,
    includeRawContent: "markdown",
    ...(includeDomains?.length ? { includeDomains } : {}),
    ...(excludeDomains?.length ? { excludeDomains } : {}),
    ...(timeRange ? { timeRange } : {}),
  });
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
  const res = await tvly().extract(urls.slice(0, 20), { extractDepth: "basic", format: "markdown" });
  return (res.results ?? []).map((r) => ({ url: r.url, raw_content: r.rawContent }));
}
