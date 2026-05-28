/* ============================================================
   Console auth helpers (plan §5.4 — per-user OIDC/SSO auth).

   Edge-safe constants live alongside the small server-side
   helpers the /login and /signup pages share. The session
   cookie is set on the parent domain in production so a sign-in
   from cantila.app (apex marketing) carries over to
   console.cantila.app (dashboard) without a re-auth round trip.
   ============================================================ */

import { cookies } from "next/headers";

/** Name of the httpOnly cookie that carries the session token. */
export const SESSION_COOKIE = "cantila_session";

/** Where the Console reaches the control plane server-side. Mirrors the
 *  /api/cantila proxy route and the /status page. */
export const CONTROL_PLANE_URL =
  process.env.CANTILA_CONTROL_PLANE_URL ?? "http://localhost:8080";

/** Parent domain the session cookie is scoped to in production.
 *  Empty/undefined in dev so cookies stay host-only on localhost. */
const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production"
    ? process.env.CANTILA_COOKIE_DOMAIN ?? ".cantila.app"
    : undefined;

/** Shared options for the session cookie — used by login, signup, and
 *  the logout route handler. SameSite=lax is required so the cookie
 *  follows top-level redirects between the marketing apex and the
 *  console subdomain. */
export function sessionCookieOptions(opts?: {
  expires?: Date | string | number;
  maxAge?: number;
}) {
  const expires =
    typeof opts?.expires === "string" ? new Date(opts.expires) : opts?.expires;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    domain: COOKIE_DOMAIN,
    ...(expires !== undefined ? { expires } : {}),
    ...(opts?.maxAge !== undefined ? { maxAge: opts.maxAge } : {}),
  };
}

/** Clamp a redirect target to a safe in-app path. Prevents open-redirect
 *  via crafted `?from=` query params on /login and /signup. */
export function safeFrom(
  from: string | undefined | null,
  fallback = "/dashboard",
): string {
  return typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//")
    ? from
    : fallback;
}

/** POST to a control-plane auth endpoint and, on success, set the
 *  session cookie. Returns an error string on failure (the caller
 *  redirects back to the originating form with it). */
export async function establishSession(
  path: string,
  body: Record<string, unknown>,
): Promise<string | null> {
  let data: { token?: string; expiresAt?: string; error?: unknown } | null;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    data = (await res.json().catch(() => null)) as typeof data;
    if (!res.ok || !data || !data.token) {
      return data && typeof data.error === "string"
        ? data.error
        : "sign-in failed";
    }
  } catch {
    return "could not reach the control plane";
  }
  cookies().set(
    SESSION_COOKIE,
    data.token,
    sessionCookieOptions({ expires: data.expiresAt }),
  );
  return null;
}

/** Best-effort fetch of which SSO provider is wired, so the login /
 *  signup pages can reflect a real OIDC IdP vs the bundled stub.
 *  Never throws. */
export async function fetchSsoInfo(): Promise<{
  label: string;
  live: boolean;
}> {
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/auth/sso/info`, {
      cache: "no-store",
    });
    if (res.ok) {
      const info = (await res.json()) as { label?: unknown; live?: unknown };
      if (typeof info.label === "string") {
        return { label: info.label, live: info.live === true };
      }
    }
  } catch {
    // control plane unreachable — fall through to the default
  }
  return { label: "SSO", live: false };
}
