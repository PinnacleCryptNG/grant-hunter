import { NextResponse } from "next/server";
import { getDigest } from "@/lib/digest";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const uid = await currentUserId();
  const regenerate = new URL(req.url).searchParams.get("regenerate") === "1";
  return NextResponse.json({ digest: await getDigest(uid, { regenerate }) });
}
