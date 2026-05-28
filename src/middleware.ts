/* ============================================================
   Console auth gate (plan §5.4 — per-user OIDC/SSO auth).

   Every route under the (console) group requires a session. This
   middleware redirects unauthenticated requests to /login, keeping
   the intended path in ?from= so login can return the user there.
   /login, /logout and the public /status page are always allowed,
   and the /api/cantila proxy is excluded by the matcher (its calls
   are authenticated server-side by CANTILA_API_KEY, unchanged).

   The session itself is minted and verified by the control plane —
   this gate only checks the cookie is present.
   ============================================================ */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/** Routes that never require a session. */
const PUBLIC_PREFIXES = ["/login", "/logout", "/status", "/invite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isPublic) return NextResponse.next();

  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  // No session — bounce to login, remembering where they were headed.
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except Next internals, the API proxy, and static
    // metadata files.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
