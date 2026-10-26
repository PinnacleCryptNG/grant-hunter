import { cookies } from "next/headers";
import { one, query } from "./db";
import { DEMO_PROFILE, DEMO_USER_ID } from "./seed";
import type { Profile } from "./types";

export const UID_COOKIE = "gh_uid";

async function ensureDemoUser() {
  await query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [DEMO_USER_ID]);
  await query(
    "INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
    [DEMO_USER_ID, JSON.stringify(DEMO_PROFILE)],
  );
}

/** New visitors start as a copy of the demo profile and its scored opportunities, so judges see data instantly. */
async function ensureUser(id: string) {
  await ensureDemoUser();
  if (id === DEMO_USER_ID) return;
  const inserted = await query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id", [id]);
  if (inserted.length === 0) {
    await query("UPDATE users SET last_seen = now() WHERE id = $1", [id]);
    return;
  }
  await query(
    "INSERT INTO profiles (user_id, data) SELECT $1, data FROM profiles WHERE user_id = $2 ON CONFLICT DO NOTHING",
    [id, DEMO_USER_ID],
  );
  await query(
    `INSERT INTO user_opportunities (user_id, opportunity_id, score, scoring, status, model)
     SELECT $1, opportunity_id, score, scoring, 'new', model FROM user_opportunities WHERE user_id = $2
     ON CONFLICT DO NOTHING`,
    [id, DEMO_USER_ID],
  );
}

export async function currentUserId(): Promise<string> {
  const store = await cookies();
  const id = store.get(UID_COOKIE)?.value;
  const uid = id && /^[a-zA-Z0-9_-]{6,64}$/.test(id) ? id : DEMO_USER_ID;
  await ensureUser(uid);
  return uid;
}

export async function getProfile(userId: string): Promise<Profile> {
  const row = await one<{ data: Profile }>("SELECT data FROM profiles WHERE user_id = $1", [userId]);
  return { ...DEMO_PROFILE, ...(row?.data ?? {}) };
}

export async function saveProfile(userId: string, profile: Profile) {
  await query(
    `INSERT INTO profiles (user_id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, JSON.stringify(profile)],
  );
  await query("INSERT INTO events (user_id, action) VALUES ($1, 'profile_updated')", [userId]);
}
