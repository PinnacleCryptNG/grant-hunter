import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { draftKindsFor, workTypeOf, type DraftKind } from "@/lib/actions";
import { draftApplication } from "@/lib/draft";
import { llmConfigured } from "@/lib/llm";
import { loadMemory } from "@/lib/memory";
import { getOpportunity } from "@/lib/opportunities";
import { guard } from "@/lib/ratelimit";
import { withTrace } from "@/lib/trace";
import { currentUserId, getProfile } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!llmConfigured()) return NextResponse.json({ error: "NEBIUS_API_KEY is not set on the server." }, { status: 503 });
  const uid = await currentUserId();
  const id = Number((await params).id);
  const opp = await getOpportunity(uid, id);
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limited = await guard(req, uid, "llm");
  if (limited) return limited;
  const body = (await req.json().catch(() => ({}))) as { kind?: DraftKind; notes?: string };
  const allowed = draftKindsFor(opp.kind, workTypeOf(opp.extracted, opp.kind, opp.title));
  const kind: DraftKind = body.kind && allowed.includes(body.kind) ? body.kind : allowed[0];
  try {
    const [profile, memory] = await Promise.all([getProfile(uid), withTrace({ userId: uid, subject: `opp:${id}` }, () => loadMemory(uid, Number(id)))]);
    const { text, model } = await withTrace({ userId: uid, subject: `opp:${id}` }, () => draftApplication(opp.extracted, opp.url, profile, memory, kind, body.notes?.slice(0, 800)));
    const row = await one("INSERT INTO drafts (user_id, opportunity_id, content, model) VALUES ($1, $2, $3, $4) RETURNING id, content, model, approved, created_at", [uid, id, text, model]);
    await query("INSERT INTO events (user_id, opportunity_id, action) VALUES ($1, $2, $3)", [uid, id, `draft:${kind}`]);
    return NextResponse.json({ draft: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await currentUserId();
  const id = Number((await params).id);
  const body = (await req.json()) as { draftId: number; content?: string; approved?: boolean };
  const row = await one(
    `UPDATE drafts SET content = COALESCE($4, content), approved = COALESCE($5, approved)
     WHERE id = $3 AND user_id = $1 AND opportunity_id = $2 RETURNING id, content, model, approved, created_at`,
    [uid, id, body.draftId, typeof body.content === "string" ? body.content.slice(0, 20000) : null, typeof body.approved === "boolean" ? body.approved : null],
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draft: row });
}
