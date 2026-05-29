/* ============================================================
   OAuth callback — the IdP redirects the browser here with
   ?code&state. We validate state against the httpOnly cookie set
   at /login (CSRF guard), exchange the code at the control plane,
   set the session cookie, and bounce to the originating page.
   ============================================================ */

import { NextResponse, type NextRequest } from "next/server";
import {
  CONTROL_PLANE_URL,
  SESSION_COOKIE,
  consumeOauthState,
  safeFrom,
  sessionCookieOptions,
} from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } },
) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? undefined;
  const state = url.searchParams.get("state") ?? undefined;
  const origin = url.origin;

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  const stored = consumeOauthState(state);
  if (!stored || stored.provider !== params.provider) {
    return fail("sign-in expired or was tampered with — please try again");
  }
  if (!code) return fail("sign-in was cancelled");

  let token: string;
  let expiresAt: string | undefined;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/auth/sso/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: params.provider, code }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      token?: string;
      expiresAt?: string;
      error?: unknown;
    } | null;
    if (!res.ok || !data?.token) {
      return fail(
        data && typeof data.error === "string" ? data.error : "sign-in failed",
      );
    }
    token = data.token;
    expiresAt = data.expiresAt;
  } catch {
    return fail("could not reach the control plane");
  }

  const res = NextResponse.redirect(`${origin}${safeFrom(stored.from)}`);
  res.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions({ expires: expiresAt }),
  );
  return res;
}
