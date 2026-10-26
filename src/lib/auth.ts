import { randomBytes } from "node:crypto";
import { one, query } from "./db";

export type GithubUser = { id: number; login: string; avatar_url: string | null };

export const OAUTH_STATE_COOKIE = "gh_oauth_state";
const GITHUB = process.env.GITHUB_OAUTH_BASE ?? "https://github.com";
const GITHUB_API = process.env.GITHUB_API_BASE ?? "https://api.github.com";

export const githubConfigured = () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
export const randomId = () => randomBytes(16).toString("hex");

export function authorizeUrl(origin: string, state: string) {
  const u = new URL(`${GITHUB}/login/oauth/authorize`);
  u.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", `${origin}/api/auth/github/callback`);
  u.searchParams.set("state", state);
  u.searchParams.set("allow_signup", "true");
  return u.toString();
}

export async function fetchGithubUser(code: string, origin: string): Promise<GithubUser> {
  const tok = (await fetch(`${GITHUB}/login/oauth/access_token`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/api/auth/github/callback`,
    }),
  }).then((r) => r.json())) as { access_token?: string; error?: string };
  if (!tok.access_token) throw new Error(tok.error ?? "GitHub returned no access token");
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: { authorization: `Bearer ${tok.access_token}`, accept: "application/vnd.github+json", "user-agent": "grant-hunter" },
  });
  if (!res.ok) throw new Error(`GitHub /user ${res.status}`);
  const u = (await res.json()) as { id: number; login: string; avatar_url?: string };
  return { id: u.id, login: u.login, avatar_url: u.avatar_url ?? null };
}

const USER_TABLES = ["profiles", "user_opportunities", "drafts", "events", "hunts", "digests", "agent_steps"];

/**
 * Returns the user id this browser should use after signing in as `gh`.
 * A first sign-in turns the current anonymous visitor into the account, so nothing is lost.
 * Signing in to an existing account from a new browser keeps that account's data; the
 * visitor's anonymous data moves over only if the account has no profile yet.
 */
export async function signInWithGithub(currentId: string | null, gh: GithubUser): Promise<string> {
  const account = await one<{ id: string }>("SELECT id FROM users WHERE github_id = $1", [gh.id]);
  const current = currentId
    ? await one<{ id: string; github_id: string | null }>("SELECT id, github_id::text AS github_id FROM users WHERE id = $1", [currentId])
    : null;
  if (account) {
    if (current && current.id !== account.id && !current.github_id) {
      const hasProfile = await one("SELECT 1 AS x FROM profiles WHERE user_id = $1", [account.id]);
      if (!hasProfile) for (const t of USER_TABLES) await query(`UPDATE ${t} SET user_id = $2 WHERE user_id = $1`, [current.id, account.id]);
    }
    await query("UPDATE users SET github_login = $2, avatar_url = $3, last_seen = now() WHERE id = $1", [account.id, gh.login, gh.avatar_url]);
    return account.id;
  }
  if (current && !current.github_id) {
    await query("UPDATE users SET github_id = $2, github_login = $3, avatar_url = $4, last_seen = now() WHERE id = $1", [current.id, gh.id, gh.login, gh.avatar_url]);
    return current.id;
  }
  const id = randomId();
  await query("INSERT INTO users (id, github_id, github_login, avatar_url) VALUES ($1, $2, $3, $4)", [id, gh.id, gh.login, gh.avatar_url]);
  return id;
}

export const uidCookie = (secure: boolean) => ({ httpOnly: true, sameSite: "lax" as const, secure, maxAge: 60 * 60 * 24 * 365, path: "/" });
