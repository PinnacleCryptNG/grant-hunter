import { NextResponse } from "next/server";
import { budgetConfig, canSpend } from "@/lib/budget";
import { one } from "@/lib/db";
import { getDigest } from "@/lib/digest";
import { runHunt } from "@/lib/hunt";
import { recheckSaved } from "@/lib/recheck";
import { authorizedCron } from "@/lib/cron";
import { deliverDigest } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HUNT_EVERY_DAYS = Number(process.env.CRON_HUNT_EVERY_DAYS) || 3;

/**
 * One user's scheduled run, in its own function invocation so each gets the full time limit. The digest
 * goes out daily; a fresh hunt only runs every CRON_HUNT_EVERY_DAYS and only while Tavily credits allow.
 */
export async function POST(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const recent = await one("SELECT id FROM hunts WHERE user_id = $1 AND status = 'done' AND created_at > now() - make_interval(hours => $2)", [userId, HUNT_EVERY_DAYS * 24 - 6]);
    const hunt = !recent && (await canSpend(budgetConfig().huntCost)).ok ? await runHunt(userId, "schedule", { maxNew: 8 }) : null;
    const rechecked = (await canSpend(3)).ok ? await recheckSaved(userId).catch(() => []) : [];
    const digest = await getDigest(userId, { regenerate: true });
    const delivered = digest ? await deliverDigest(userId, digest).catch(() => false) : false;
    return NextResponse.json({ ok: true, hunted: Boolean(hunt), scored: hunt?.stats.scored ?? 0, rechecked: rechecked.length, delivered });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
}
