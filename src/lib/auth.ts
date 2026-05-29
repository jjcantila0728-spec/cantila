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

/* ============================================================
   OAuth (Google / GitHub) redirect-flow helpers.

   The Console drives a browser redirect round-trip whose callback
   lands on the apex (/auth/callback/[provider]) so it can set the
   session cookie. A short-lived httpOnly state cookie carries the
   OAuth `state`, the originating `from` path, and the provider id
   between /login and the callback to guard against login-CSRF.
   ============================================================ */

/** Short-lived cookie carrying the OAuth `state`, the originating
 *  `from` path, and the provider id between /login and the callback.
 *  httpOnly + 10-minute lifetime; cleared on callback. */
export const OAUTH_STATE_COOKIE = "cantila_oauth_state";

/** The public origin the OAuth callback is registered under. Mirrors the
 *  apex host the middleware serves the auth pages on. */
function oauthBaseUrl(): string {
  return (
    process.env.CANTILA_PUBLIC_ORIGIN ??
    (process.env.NODE_ENV === "production"
      ? "https://cantila.app"
      : "http://localhost:3000")
  );
}

/** Begin an OAuth login: ask the control plane for the authorize URL,
 *  stash {state, from, provider} in an httpOnly cookie, and return the
 *  URL the caller should redirect the browser to. Returns null on
 *  failure (caller redirects back with an error). */
export async function beginOauth(
  provider: "google" | "github",
  from: string,
): Promise<string | null> {
  const redirectUri = `${oauthBaseUrl()}/auth/callback/${provider}`;
  let authorizeUrl: string;
  let state: string;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/auth/sso/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, redirectUri }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      authorizeUrl?: string;
      state?: string;
    } | null;
    if (!res.ok || !data?.authorizeUrl || !data?.state) return null;
    authorizeUrl = data.authorizeUrl;
    state = data.state;
  } catch {
    return null;
  }
  cookies().set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, from, provider }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      domain: COOKIE_DOMAIN,
    },
  );
  return authorizeUrl;
}

/** Validate and consume the state cookie on callback. Returns the stored
 *  {from, provider} when `presentedState` matches, else null. Always
 *  clears the cookie. */
export function consumeOauthState(
  presentedState: string | undefined,
): { from: string; provider: string } | null {
  const raw = cookies().get(OAUTH_STATE_COOKIE)?.value;
  cookies().delete(OAUTH_STATE_COOKIE);
  if (!raw || !presentedState) return null;
  try {
    const parsed = JSON.parse(raw) as {
      state?: string;
      from?: string;
      provider?: string;
    };
    if (!parsed.state || parsed.state !== presentedState) return null;
    return {
      from: typeof parsed.from === "string" ? parsed.from : "/dashboard",
      provider: parsed.provider ?? "",
    };
  } catch {
    return null;
  }
}

/** Fetch the configured providers so the buttons reflect what is wired.
 *  Never throws. */
export async function fetchOauthProviders(): Promise<
  Array<{ id: string; label: string; live: boolean }>
> {
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/auth/sso/info`, {
      cache: "no-store",
    });
    if (res.ok) {
      const info = (await res.json()) as { providers?: unknown };
      if (Array.isArray(info.providers)) {
        return info.providers as Array<{
          id: string;
          label: string;
          live: boolean;
        }>;
      }
    }
  } catch {
    /* control plane unreachable */
  }
  return [];
}
