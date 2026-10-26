import { NextResponse } from "next/server";
import { getDigest } from "@/lib/digest";
import { runHunt } from "@/lib/hunt";
import { recheckSaved } from "@/lib/recheck";
import { authorizedCron } from "@/lib/cron";
import { deliverDigest } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** One user's scheduled hunt + digest, in its own function invocation so each gets the full time limit. */
export async function POST(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const { stats } = await runHunt(userId, "schedule", { maxNew: 8 });
    const rechecked = await recheckSaved(userId).catch(() => []);
    const digest = await getDigest(userId, { regenerate: true });
    const delivered = digest ? await deliverDigest(userId, digest).catch(() => false) : false;
    return NextResponse.json({ ok: true, scored: stats.scored, rechecked: rechecked.length, delivered });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
}
