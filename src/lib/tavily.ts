const TAVILY_URL = "https://api.tavily.com";

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

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not set");
  const res = await fetch(`${TAVILY_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Tavily ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export type SearchOpts = {
  query: string;
  includeDomains?: string[];
  maxResults?: number;
  timeRange?: "day" | "week" | "month" | "year";
};

export async function tavilySearch({ query, includeDomains, maxResults = 6, timeRange }: SearchOpts) {
  const data = await post<{ results: TavilyResult[] }>("/search", {
    query,
    search_depth: "advanced",
    max_results: maxResults,
    include_raw_content: "markdown",
    ...(includeDomains?.length ? { include_domains: includeDomains } : {}),
    ...(timeRange ? { time_range: timeRange } : {}),
  });
  return data.results ?? [];
}

export async function tavilyExtract(urls: string[]) {
  if (urls.length === 0) return [] as { url: string; raw_content: string }[];
  const data = await post<{ results: { url: string; raw_content: string }[] }>("/extract", {
    urls,
    extract_depth: "basic",
    format: "markdown",
  });
  return data.results ?? [];
}
