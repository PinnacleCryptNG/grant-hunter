import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/cron";
import { query } from "@/lib/db";
import { hasProfileSignal } from "@/lib/profile";
import { getProfile } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_USERS = Number(process.env.CRON_MAX_USERS) || 10;

/**
 * Daily schedule. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`; it fans out one
 * /api/cron/hunt invocation per active user (each with its own time limit) and retries failures once.
 */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await query<{ id: string }>(
    `SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE COALESCE(p.data->>'huntSchedule', 'daily') = 'daily' AND u.last_seen > now() - interval '7 days'
     ORDER BY u.last_seen DESC LIMIT $1`,
    [MAX_USERS * 2],
  );
  const users: string[] = [];
  for (const r of rows) if (users.length < MAX_USERS && hasProfileSignal(await getProfile(r.id))) users.push(r.id);

  const worker = new URL("/api/cron/hunt", req.url);
  const run = async (userId: string) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(worker, { method: "POST", headers: { authorization: req.headers.get("authorization")!, "content-type": "application/json" }, body: JSON.stringify({ userId }) });
        if (res.ok) return { attempt, ...(await res.json()) };
      } catch {
        // retry below
      }
    }
    return { ok: false };
  };
  const results = await Promise.all(users.map(run));
  return NextResponse.json({ ok: true, users: users.length, succeeded: results.filter((r) => r.ok).length, results });
}
