import { NextResponse, type NextRequest } from "next/server";
import { fetchGithubUser, githubConfigured, OAUTH_STATE_COOKIE, signInWithGithub, uidCookie } from "@/lib/auth";
import { appOrigin } from "@/lib/url";
import { UID_COOKIE, UID_PATTERN } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin, protocol } = req.nextUrl;
  const fail = (why: string) => NextResponse.redirect(new URL(`/login?error=${why}`, origin));
  if (!githubConfigured()) return fail("unavailable");
  if (searchParams.get("error")) return fail("denied");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) return fail("state");
  try {
    const gh = await fetchGithubUser(code, appOrigin(origin));
    const current = req.cookies.get(UID_COOKIE)?.value;
    const id = await signInWithGithub(current && UID_PATTERN.test(current) ? current : null, gh);
    const res = NextResponse.redirect(new URL("/dashboard?signed_in=1", origin));
    res.cookies.set(UID_COOKIE, id, uidCookie(protocol === "https:"));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch {
    return fail("github");
  }
}
