import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { botUsername, createLinkCode, telegramConfigured } from "@/lib/telegram";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!telegramConfigured()) return NextResponse.json({ error: "Telegram delivery isn't set up on this server yet." }, { status: 503 });
  const uid = await currentUserId();
  const code = await createLinkCode(uid);
  return NextResponse.json({ url: `https://t.me/${botUsername()}?start=${code}` });
}

export async function DELETE() {
  const uid = await currentUserId();
  await query("UPDATE users SET telegram_chat_id = NULL, telegram_link_code = NULL WHERE id = $1", [uid]);
  return NextResponse.json({ ok: true });
}
