import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const current = req.cookies.get("gh_uid")?.value;
  if (current && /^[a-zA-Z0-9_-]{6,64}$/.test(current)) return NextResponse.next();
  const id = crypto.randomUUID().replace(/-/g, "");
  req.cookies.set("gh_uid", id);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set("gh_uid", id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}

export const config = { matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|svg|ico|jpg|webp)$).*)"] };
