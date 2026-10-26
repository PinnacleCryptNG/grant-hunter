import { NextResponse } from "next/server";
import { runHunt } from "@/lib/hunt";
import { llmConfigured } from "@/lib/llm";
import { hasProfileSignal } from "@/lib/profile";
import { tavilyConfigured } from "@/lib/tavily";
import { currentUserId, getProfile } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (!llmConfigured() || !tavilyConfigured()) return NextResponse.json({ error: "NEBIUS_API_KEY and TAVILY_API_KEY must be set on the server." }, { status: 503 });
  const uid = await currentUserId();
  if (!hasProfileSignal(await getProfile(uid))) return NextResponse.json({ error: "Fill in your profile first: add at least one skill, interest or ecosystem so the agent knows what to hunt for." }, { status: 400 });
  try {
    const { stats, queries } = await runHunt(uid, "manual");
    return NextResponse.json({ stats, queries });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
