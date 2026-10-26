import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOpportunity } from "@/lib/opportunities";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "saved", "applied", "rejected"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await currentUserId();
  const id = Number((await params).id);
  const opp = await getOpportunity(uid, id);
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const drafts = await query("SELECT id, content, model, approved, created_at FROM drafts WHERE user_id = $1 AND opportunity_id = $2 ORDER BY created_at DESC", [uid, id]);
  return NextResponse.json({ opportunity: opp, drafts });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await currentUserId();
  const id = Number((await params).id);
  const body = (await req.json()) as { status?: string; feedback?: string };
  if (body.status && !STATUSES.includes(body.status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const feedback = typeof body.feedback === "string" ? body.feedback.slice(0, 500) : null;
  const rows = await query(
    `UPDATE user_opportunities SET status = COALESCE($3, status), feedback = COALESCE($4, feedback), updated_at = now()
     WHERE user_id = $1 AND opportunity_id = $2 RETURNING status, feedback`,
    [uid, id, body.status ?? null, feedback],
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await query("INSERT INTO events (user_id, opportunity_id, action, note) VALUES ($1, $2, $3, $4)", [uid, id, body.status ? `status:${body.status}` : "feedback", feedback]);
  return NextResponse.json(rows[0]);
}
