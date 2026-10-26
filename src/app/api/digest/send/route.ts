import { NextResponse } from "next/server";
import { getDigest } from "@/lib/digest";
import { guard } from "@/lib/ratelimit";
import { deliverDigest } from "@/lib/telegram";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const uid = await currentUserId();
  const limited = await guard(req, uid, "llm");
  if (limited) return limited;
  const digest = await getDigest(uid);
  if (!digest) return NextResponse.json({ error: "No digest yet. Run a hunt first." }, { status: 404 });
  try {
    const sent = await deliverDigest(uid, digest, { force: true });
    if (!sent) return NextResponse.json({ error: "Connect Telegram on your profile first." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Telegram didn't accept the message. Try reconnecting on your profile." }, { status: 502 });
  }
}
