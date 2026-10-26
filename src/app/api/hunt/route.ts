import { NextResponse } from "next/server";
import { runHunt } from "@/lib/hunt";
import { llmConfigured } from "@/lib/llm";
import { tavilyConfigured } from "@/lib/tavily";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (!llmConfigured() || !tavilyConfigured()) return NextResponse.json({ error: "NEBIUS_API_KEY and TAVILY_API_KEY must be set on the server." }, { status: 503 });
  const uid = await currentUserId();
  try {
    const { stats, queries } = await runHunt(uid, "manual");
    return NextResponse.json({ stats, queries });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
