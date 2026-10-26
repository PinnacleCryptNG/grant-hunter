import { NextResponse } from "next/server";
import { EMPTY_PROFILE } from "@/lib/seed";
import type { Profile } from "@/lib/types";
import { currentUserId, getProfile, saveProfile } from "@/lib/user";

export const dynamic = "force-dynamic";

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x: string) => x.trim().slice(0, 80)).slice(0, 40) : []);
const num = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function sanitize(b: Partial<Profile>): Profile {
  let tz = str(b.timezone, 64) || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  return {
    ...EMPTY_PROFILE,
    name: str(b.name, 120),
    headline: str(b.headline, 200),
    bio: str(b.bio, 2000),
    skills: list(b.skills),
    ecosystems: list(b.ecosystems),
    interests: list(b.interests),
    links: (Array.isArray(b.links) ? b.links : []).filter((l) => l && l.url).slice(0, 12).map((l) => ({ label: str(l.label, 40), url: str(l.url, 300) })),
    portfolio: (Array.isArray(b.portfolio) ? b.portfolio : []).filter((p) => p && (p.title || p.url)).slice(0, 12).map((p) => ({ title: str(p.title, 120), url: str(p.url, 300), description: str(p.description, 500) })),
    country: str(b.country, 80),
    timezone: tz,
    hourlyRateUsd: num(b.hourlyRateUsd),
    minRewardUsd: num(b.minRewardUsd),
    preferredPayout: list(b.preferredPayout),
    avoid: list(b.avoid),
    huntSchedule: b.huntSchedule === "off" ? "off" : "daily",
  };
}

export async function GET() {
  const uid = await currentUserId();
  return NextResponse.json({ profile: await getProfile(uid) });
}

export async function PUT(req: Request) {
  const uid = await currentUserId();
  const profile = sanitize(await req.json());
  await saveProfile(uid, profile);
  return NextResponse.json({ profile });
}
