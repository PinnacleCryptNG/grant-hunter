import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, githubConfigured, OAUTH_STATE_COOKIE, randomId } from "@/lib/auth";
import { appOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  if (!githubConfigured()) return NextResponse.redirect(new URL("/login?error=unavailable", req.nextUrl.origin));
  const state = randomId();
  const res = NextResponse.redirect(authorizeUrl(appOrigin(req.nextUrl.origin), state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 600, path: "/" });
  return res;
}
