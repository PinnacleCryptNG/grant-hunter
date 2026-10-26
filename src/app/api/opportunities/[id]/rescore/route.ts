import { NextResponse } from "next/server";
import { scoreForUser } from "@/lib/hunt";
import { llmConfigured } from "@/lib/llm";
import { getOpportunity } from "@/lib/opportunities";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!llmConfigured()) return NextResponse.json({ error: "NEBIUS_API_KEY is not set on the server." }, { status: 503 });
  const uid = await currentUserId();
  const id = Number((await params).id);
  const opp = await getOpportunity(uid, id);
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    return NextResponse.json({ scoring: await scoreForUser(uid, id, opp.extracted) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
