import { NextResponse, type NextRequest } from "next/server";
import { randomId, uidCookie } from "@/lib/auth";
import { UID_COOKIE } from "@/lib/user";

export const dynamic = "force-dynamic";

/** Signing out gives this browser a fresh anonymous id; the account's data stays with the account. */
export function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(UID_COOKIE, randomId(), uidCookie(req.nextUrl.protocol === "https:"));
  return res;
}
