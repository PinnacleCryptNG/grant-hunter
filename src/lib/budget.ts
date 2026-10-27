import { one, query } from "./db";

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && v !== "" && v !== undefined ? n : fallback;
}

/** Tavily credit budget. Defaults fit the free Researcher plan (1,000 credits a month). */
export function budgetConfig(env: Record<string, string | undefined> = process.env) {
  return {
    monthly: num(env.TAVILY_MONTHLY_BUDGET, 900),
    burst: num(env.TAVILY_DAILY_BURST, 120),
    huntCost: num(env.TAVILY_HUNT_ESTIMATE, 25),
    reserve: num(env.TAVILY_ACCOUNT_RESERVE, 40),
  };
}

/** Month-to-date allowance: an even daily share plus a burst, so a busy week can't use up the whole month. */
export function pacedAllowance(monthly: number, burst: number, now = new Date()) {
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  return Math.min(monthly, Math.ceil((monthly * now.getUTCDate()) / days) + burst);
}

/** Fallback when a response has no usage field, per https://docs.tavily.com/documentation/api-credits */
export function estimateCredits(op: "search" | "extract" | "crawl", count: number, depth: "basic" | "advanced" = "basic") {
  if (op === "search") return depth === "advanced" ? 2 : 1;
  if (op === "extract") return Math.ceil(count / 5) * (depth === "advanced" ? 2 : 1);
  return Math.ceil(count / 10) * 2 + Math.ceil(count / 5);
}

const g = globalThis as { __ghTavilyUsage?: { at: number; remaining: number | null } };

export async function recordCredits(n: number) {
  if (!(n > 0)) return;
  if (g.__ghTavilyUsage?.remaining != null) g.__ghTavilyUsage.remaining -= n;
  await query(
    `INSERT INTO tavily_spend (day, credits) VALUES ((now() AT TIME ZONE 'UTC')::date, $1)
     ON CONFLICT (day) DO UPDATE SET credits = tavily_spend.credits + EXCLUDED.credits`,
    [Math.ceil(n)],
  ).catch(() => {});
}

async function monthSpent() {
  const row = await one<{ n: number }>(
    "SELECT COALESCE(SUM(credits), 0)::int AS n FROM tavily_spend WHERE day >= date_trunc('month', now() AT TIME ZONE 'UTC')::date",
  );
  return Number(row?.n ?? 0);
}

/** Credits left on the Tavily account itself (cached 10 minutes); null if the plan has no limit or the call fails. */
async function accountRemaining() {
  const c = g.__ghTavilyUsage;
  if (c && Date.now() - c.at < 600_000) return c.remaining;
  let remaining: number | null = null;
  try {
    const res = await fetch("https://api.tavily.com/usage", { headers: { authorization: `Bearer ${process.env.TAVILY_API_KEY}` }, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const a = ((await res.json()) as { account?: { plan_limit: number | null; plan_usage: number; paygo_limit: number | null; paygo_usage: number } }).account;
      if (a?.plan_limit != null) remaining = a.plan_limit - a.plan_usage + Math.max(0, (a.paygo_limit ?? 0) - (a.paygo_usage ?? 0));
    }
  } catch {
    // Fall back to our own ledger.
  }
  g.__ghTavilyUsage = { at: Date.now(), remaining };
  return remaining;
}

export type Budget = { spent: number; monthly: number; allowance: number; account: number | null; remaining: number; limitedBy: "pace" | "month" | "account" };

export async function tavilyBudget(now = new Date()): Promise<Budget> {
  const c = budgetConfig();
  const [spent, account] = await Promise.all([monthSpent(), accountRemaining()]);
  const allowance = pacedAllowance(c.monthly, c.burst, now);
  const ours = allowance - spent;
  const theirs = account == null ? Infinity : account - c.reserve;
  const limitedBy = theirs < ours ? "account" : allowance >= c.monthly ? "month" : "pace";
  return { spent, monthly: c.monthly, allowance, account, remaining: Math.max(0, Math.min(ours, theirs)), limitedBy };
}

export async function canSpend(credits: number) {
  const budget = await tavilyBudget();
  return { ok: budget.remaining >= credits, budget };
}

export function budgetMessage(b: Pick<Budget, "limitedBy">) {
  const rest = "Your saved opportunities, drafts and digest still work.";
  if (b.limitedBy === "pace") return `Grant Hunter has used today's share of its web-search credits. New hunts open up again tomorrow. ${rest}`;
  return `Grant Hunter has used this month's web-search credits. Hunts resume when they reset at the start of next month. ${rest}`;
}
