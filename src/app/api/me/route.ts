import { NextResponse } from "next/server";
import { githubConfigured } from "@/lib/auth";
import { one } from "@/lib/db";
import { botUsername, telegramConfigured } from "@/lib/telegram";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await currentUserId();
  const u = await one<{ github_login: string | null; avatar_url: string | null; tg: boolean }>(
    "SELECT github_login, avatar_url, telegram_chat_id IS NOT NULL AS tg FROM users WHERE id = $1",
    [uid],
  );
  return NextResponse.json({
    github: u?.github_login ? { login: u.github_login, avatar: u.avatar_url } : null,
    telegram: Boolean(u?.tg),
    available: { github: githubConfigured(), telegram: telegramConfigured() ? botUsername() : null },
  });
}
