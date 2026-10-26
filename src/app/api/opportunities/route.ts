import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/opportunities";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await currentUserId();
  return NextResponse.json({ opportunities: await listOpportunities(uid) });
}
