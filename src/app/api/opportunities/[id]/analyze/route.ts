import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { analyzeFit } from "@/lib/draft";
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
  try {
    const [profile, memory] = await Promise.all([getProfile(uid), withTrace({ userId: uid, subject: `opp:${id}` }, () => loadMemory(uid, Number(id)))]);
    const { data, model } = await withTrace({ userId: uid, subject: `opp:${id}` }, () => analyzeFit(opp.extracted, profile, memory));
    const analysis = { ...data, model, createdAt: new Date().toISOString() };
    await query("UPDATE user_opportunities SET analysis = $3 WHERE user_id = $1 AND opportunity_id = $2", [uid, id, JSON.stringify(analysis)]);
    return NextResponse.json({ analysis });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
