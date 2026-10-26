import { NextResponse } from "next/server";
import { one, query } from "./db";

export type Action = "hunt" | "llm";
export type Limit = { key: string; max: number; windowSec: number; scope: "you" | "network" | "site" };

const HOUR = 3600;
const DAY = 86400;

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Per-visitor, per-IP and site-wide caps. Hunts and Ultra calls spend Tavily and Token Factory credits. */
export function limitsFor(action: Action, uid: string, ip: string, env: Record<string, string | undefined> = process.env): Limit[] {
  if (action === "hunt")
    return [
      { key: `hunt:u:${uid}`, max: num(env.HUNT_LIMIT_PER_USER_HOUR, 4), windowSec: HOUR, scope: "you" },
      { key: `hunt:ip:${ip}`, max: num(env.HUNT_LIMIT_PER_IP_HOUR, 8), windowSec: HOUR, scope: "network" },
      { key: "hunt:site", max: num(env.HUNT_LIMIT_PER_DAY, 200), windowSec: DAY, scope: "site" },
    ];
  return [
    { key: `llm:u:${uid}`, max: num(env.LLM_LIMIT_PER_USER_HOUR, 20), windowSec: HOUR, scope: "you" },
    { key: `llm:ip:${ip}`, max: num(env.LLM_LIMIT_PER_IP_HOUR, 40), windowSec: HOUR, scope: "network" },
    { key: "llm:site", max: num(env.LLM_LIMIT_PER_DAY, 1000), windowSec: DAY, scope: "site" },
  ];
}

export function windowStart(nowMs: number, windowSec: number) {
  return Math.floor(nowMs / 1000 / windowSec) * windowSec;
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function hit(l: Limit, now: number) {
  const start = windowStart(now, l.windowSec);
  const row = await one<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1 RETURNING count`,
    [l.key, start],
  );
  return { ok: Number(row?.count ?? 1) <= l.max, retryAfter: start + l.windowSec - Math.floor(now / 1000) };
}

export function limitMessage(action: Action, l: Limit, retryAfter: number) {
  const what = action === "hunt" ? "hunts" : "AI requests";
  if (l.scope === "site") return `Grant Hunter has reached today's limit of ${l.max} ${what} for the whole site. Please try again tomorrow.`;
  const mins = Math.max(1, Math.ceil(retryAfter / 60));
  return `You've reached the limit of ${l.max} ${what} per hour${l.scope === "network" ? " from your network" : ""}. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}

/** Returns a 429 response if any limit is exceeded, otherwise null. */
export async function guard(req: Request, uid: string, action: Action): Promise<NextResponse | null> {
  const now = Date.now();
  if (Math.random() < 0.02) await query("DELETE FROM rate_limits WHERE window_start < $1", [Math.floor(now / 1000) - 2 * DAY]).catch(() => {});
  for (const l of limitsFor(action, uid, clientIp(req))) {
    const { ok, retryAfter } = await hit(l, now);
    if (!ok)
      return NextResponse.json({ error: limitMessage(action, l, retryAfter) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  return null;
}
