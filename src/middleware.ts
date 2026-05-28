/* ============================================================
   Cantila Console middleware — two jobs, one matcher.

   1) **Host-based routing** between the public marketing site
      (cantila.app) and the authenticated dashboard
      (console.cantila.app). www.cantila.app folds into the apex.
      Both surfaces live in the same Next.js app behind route
      groups (marketing) / (docs) / (legal) / (auth-public) /
      (console); this middleware bounces any request that landed
      on the wrong host so the URL the user sees matches the
      surface they're looking at.

   2) **Auth gate** (plan §5.4) — only the (console) routes
      require a session. Marketing, docs, legal, /login, /signup,
      /forgot, /logout, /status and /invite are always public.
      Anonymous access to a console-gated path bounces to /login
      preserving ?from= so login returns the user there.

   Local dev (host = localhost) skips the host-based stage and
   only enforces the auth gate, so the whole app resolves on a
   single origin.
   ============================================================ */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
const CONSOLE_HOST =
  process.env.CANTILA_CONSOLE_HOST ?? `console.${PUBLIC_HOST}`;
const WWW_HOST = `www.${PUBLIC_HOST}`;

/** Paths that only make sense on the console host. Bounced from the
 *  public host to console.cantila.app. */
const CONSOLE_ONLY_PREFIXES = [
  "/dashboard",
  "/projects",
  "/deploy",
  "/templates",
  "/domains",
  "/team",
  "/settings",
  "/billing",
  "/mail",
  "/sms",
  "/monitoring",
  "/databases",
  "/activity",
  "/agents",
  "/capacity",
  "/mailboxes",
  "/nodes",
  "/orgs",
  "/a2p",
  "/automations",
  "/connections",
];

/** Paths that only make sense on the public host. Bounced from
 *  console.cantila.app back to cantila.app. */
const PUBLIC_ONLY_PREFIXES = [
  "/pricing",
  "/products",
  "/docs",
  "/legal",
  "/mcp",
  "/about",
  "/contact",
  "/changelog",
];

/** Auth pages that live exclusively on the apex host. Bounced from the
 *  console host. Centralising the cantila.app canonical URL for sign-in,
 *  sign-up, forgot, and logout keeps the dashboard host focused on
 *  authenticated work and gives the marketing site a single auth surface. */
const AUTH_PREFIXES = ["/login", "/signup", "/forgot", "/logout"];

/** Paths that pass through without auth on any host. */
const PUBLIC_AUTH_EXACT = new Set([
  "/login",
  "/signup",
  "/forgot",
  "/logout",
  "/status",
  "/",
]);
const PUBLIC_AUTH_PREFIXES = [
  "/invite/",
  ...PUBLIC_ONLY_PREFIXES.map((p) => p + "/"),
  ...PUBLIC_ONLY_PREFIXES, // exact match too (e.g. "/pricing")
];

function hostIsLocal(host: string): boolean {
  const h = host.split(":")[0];
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.endsWith(".local")
  );
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_AUTH_EXACT.has(pathname)) return true;
  return PUBLIC_AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

/** Apply the session gate. Bounces unauthenticated console-gated
 *  requests to /login preserving the intended path. In production the
 *  login URL points at the apex (cantila.app) so the auth surface lives
 *  in one place; local dev keeps a relative redirect. */
function gate(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (hostIsLocal(host)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  const from =
    pathname !== "/" ? `?from=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(`https://${PUBLIC_HOST}/login${from}`);
}

/** Tag the forwarded request with `x-pathname` so server components
 *  (e.g. the docs layout's Article JSON-LD injector) can read the
 *  current path via `headers()`. This MUTATES the request headers
 *  passed downstream; response headers wouldn't reach the renderer. */
function passWithPath(req: NextRequest, pathname: string): NextResponse {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const { pathname, search } = req.nextUrl;

  // Local dev — skip host rerouting, only enforce the auth gate.
  if (hostIsLocal(host)) {
    // gate() may return a redirect; if it returns NextResponse.next() we
    // replace it with a path-tagged variant.
    const gated = gate(req);
    if (gated.headers.get("location")) return gated;
    return passWithPath(req, pathname);
  }

  // www → apex (permanent)
  if (host === WWW_HOST) {
    return NextResponse.redirect(
      `https://${PUBLIC_HOST}${pathname}${search}`,
      308,
    );
  }

  if (host === PUBLIC_HOST) {
    // Apex: send console-only paths to the dashboard host.
    if (
      pathname === "/dashboard" ||
      startsWithAny(pathname, CONSOLE_ONLY_PREFIXES)
    ) {
      return NextResponse.redirect(
        `https://${CONSOLE_HOST}${pathname}${search}`,
        302,
      );
    }
    const gated = gate(req);
    if (gated.headers.get("location")) return gated;
    return passWithPath(req, pathname);
  }

  if (host === CONSOLE_HOST) {
    // Console host: dashboard is the front door.
    if (pathname === "/") {
      return NextResponse.redirect(
        `https://${CONSOLE_HOST}/dashboard`,
        307,
      );
    }
    // Auth pages live on the apex only — keeps one canonical sign-in URL
    // and lets the marketing site own first-touch.
    if (startsWithAny(pathname, AUTH_PREFIXES)) {
      return NextResponse.redirect(
        `https://${PUBLIC_HOST}${pathname}${search}`,
        308,
      );
    }
    // Public-only paths bounce back to apex.
    if (startsWithAny(pathname, PUBLIC_ONLY_PREFIXES)) {
      return NextResponse.redirect(
        `https://${PUBLIC_HOST}${pathname}${search}`,
        302,
      );
    }
    const gated = gate(req);
    if (gated.headers.get("location")) return gated;
    return passWithPath(req, pathname);
  }

  // Any other host (preview URLs, IP access) — fall through to the gate.
  const gated = gate(req);
  if (gated.headers.get("location")) return gated;
  return passWithPath(req, pathname);
}

export const config = {
  matcher: [
    // Everything except Next internals, the API proxy, and static
    // metadata files.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml|brand).*)",
  ],
};
