import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getDigest } from "@/lib/digest";
import { runHunt } from "@/lib/hunt";
import { DEMO_USER_ID } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Scheduled hunt + digest. Vercel Cron calls this daily with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await query<{ id: string }>(
    `SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE COALESCE(p.data->>'huntSchedule', 'daily') = 'daily' AND (u.id = $1 OR u.last_seen > now() - interval '7 days')
     ORDER BY (u.id = $1) DESC, u.last_seen DESC LIMIT 3`,
    [DEMO_USER_ID],
  );
  const results = [];
  for (const u of users) {
    try {
      const { stats } = await runHunt(u.id, "schedule", { maxNew: 8 });
      await getDigest(u.id, { regenerate: true });
      results.push({ user: u.id === DEMO_USER_ID ? "demo" : "user", scored: stats.scored });
    } catch (e) {
      results.push({ error: String(e).slice(0, 200) });
    }
  }
  return NextResponse.json({ ok: true, results });
}
