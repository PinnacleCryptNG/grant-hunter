import { cookies } from "next/headers";
import { one, query } from "./db";
import { EMPTY_PROFILE } from "./profile";
import type { Profile } from "./types";

export const UID_COOKIE = "gh_uid";

export const UID_PATTERN = /^[a-zA-Z0-9_-]{6,64}$/;

async function ensureUser(id: string) {
  const inserted = await query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id", [id]);
  if (inserted.length === 0) await query("UPDATE users SET last_seen = now() WHERE id = $1", [id]);
}

export async function currentUserId(): Promise<string> {
  const store = await cookies();
  const id = store.get(UID_COOKIE)?.value;
  if (!id || !UID_PATTERN.test(id)) throw new Error("Missing gh_uid cookie");
  await ensureUser(id);
  return id;
}

export async function getProfile(userId: string): Promise<Profile> {
  const row = await one<{ data: Profile }>("SELECT data FROM profiles WHERE user_id = $1", [userId]);
  return { ...EMPTY_PROFILE, ...(row?.data ?? {}) };
}

export async function saveProfile(userId: string, profile: Profile) {
  await query(
    `INSERT INTO profiles (user_id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, JSON.stringify(profile)],
  );
  await query("INSERT INTO events (user_id, action) VALUES ($1, 'profile_updated')", [userId]);
}
