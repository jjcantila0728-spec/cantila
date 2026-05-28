/* ============================================================
   Logout (plan §5.4). Clears the session cookie and bounces to
   /login. Best-effort: also notifies the control plane so the
   server-side Session row is invalidated, not just the cookie.
   ============================================================ */

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  CONTROL_PLANE_URL,
  sessionCookieOptions,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await fetch(`${CONTROL_PLANE_URL}/v1/auth/logout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
    } catch {
      // Best-effort — clearing the cookie below still logs the user out
      // of the Console even if the control plane is unreachable.
    }
  }
  const res = NextResponse.redirect(new URL("/login", req.url));
  // Match the cookie domain set at login so the clear actually lands —
  // otherwise the parent-domain cookie would be orphaned on logout.
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
