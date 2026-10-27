import { after, NextResponse } from "next/server";
import { budgetConfig, budgetMessage, canSpend } from "@/lib/budget";
import { one } from "@/lib/db";
import { runHunt, startHunt } from "@/lib/hunt";
import { llmConfigured } from "@/lib/llm";
import { hasProfileSignal } from "@/lib/profile";
import { guard } from "@/lib/ratelimit";
import { tavilyConfigured } from "@/lib/tavily";
import { currentUserId, getProfile } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** A hunt still "running" after this long was cut off by the function time limit. */
const STALE_MS = 6 * 60 * 1000;

type HuntRow = { id: number; status: string; progress: unknown; stats: unknown; error: string | null; created_at: string; finished_at: string | null };

/** Starts a hunt in the background and returns its id; the dashboard polls GET for progress. */
export async function POST(req: Request) {
  if (!llmConfigured() || !tavilyConfigured()) return NextResponse.json({ error: "NEBIUS_API_KEY and TAVILY_API_KEY must be set on the server." }, { status: 503 });
  const uid = await currentUserId();
  if (!hasProfileSignal(await getProfile(uid))) return NextResponse.json({ error: "Fill in your profile first: add at least one skill, interest or ecosystem so the agent knows what to hunt for." }, { status: 400 });
  const running = await one<{ id: number }>(
    "SELECT id FROM hunts WHERE user_id = $1 AND status = 'running' AND created_at > now() - interval '6 minutes' ORDER BY id DESC LIMIT 1",
    [uid],
  );
  if (running) return NextResponse.json({ huntId: running.id }, { status: 202 });
  const credits = await canSpend(budgetConfig().huntCost);
  if (!credits.ok) return NextResponse.json({ error: budgetMessage(credits.budget) }, { status: 429 });
  const limited = await guard(req, uid, "hunt");
  if (limited) return limited;
  const huntId = await startHunt(uid, "manual");
  after(() => runHunt(uid, "manual", { huntId }).catch(() => {}));
  return NextResponse.json({ huntId }, { status: 202 });
}

/** Hunt progress: ?id=<huntId>, or the user's latest hunt. */
export async function GET(req: Request) {
  const uid = await currentUserId();
  const id = Number(new URL(req.url).searchParams.get("id"));
  const hunt = id
    ? await one<HuntRow>("SELECT id, status, progress, stats, error, created_at, finished_at FROM hunts WHERE user_id = $1 AND id = $2", [uid, id])
    : await one<HuntRow>("SELECT id, status, progress, stats, error, created_at, finished_at FROM hunts WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [uid]);
  if (!hunt) return NextResponse.json({ hunt: null });
  if (hunt.status === "running" && Date.now() - new Date(hunt.created_at).getTime() > STALE_MS)
    return NextResponse.json({ hunt: { ...hunt, status: "failed", error: "The hunt ran out of time. Try again." } });
  return NextResponse.json({ hunt });
}
