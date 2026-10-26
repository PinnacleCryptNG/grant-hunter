import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { handleUpdate, telegramConfigured, webhookSecret } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(webhookSecret());
  if (!telegramConfigured() || got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await handleUpdate(await req.json());
  } catch {
    // Always 200 so Telegram doesn't retry the same update forever.
  }
  return NextResponse.json({ ok: true });
}
