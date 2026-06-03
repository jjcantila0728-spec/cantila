/* ============================================================
   OAuth consent — pure helpers (plan §4.3.2 / MCP OAuth connector).

   The control plane's `GET /authorize` validates the request, then
   302s the browser here (`console.cantila.app/oauth/consent`) with the
   authorization parameters in the query. This module holds the pure,
   side-effect-free logic the consent page uses: parsing/validating
   those params, guarding the deny-redirect against open-redirect, and
   re-building the consent URL for the sign-in round trip.

   Kept separate from the page so the decision logic is unit-testable
   without a React/Next render harness.
   ============================================================ */

/** The authorization-request fields the consent screen needs. */
export interface ConsentParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  state?: string;
  /** Display-only — the DCR-registered client name. Untrusted text. */
  clientName: string;
}

export type ConsentParseResult =
  | { ok: true; params: ConsentParams }
  | { ok: false; reason: string };

type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

/** Schemes we will never bounce a browser to on deny — they can execute
 *  script or read local resources. Everything else (http, https, and
 *  custom app schemes like `vscode://` / `cursor://` that native MCP
 *  hosts register) is allowed. */
const BLOCKED_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
]);

/** True when `uri` parses as an absolute URL with a non-dangerous scheme.
 *  Used to guard the deny-path redirect against open-redirect / XSS. The
 *  allow path does not rely on this — the control plane re-validates the
 *  redirect_uri against the registered client before minting a code. */
export function isSafeRedirectTarget(uri: string): boolean {
  try {
    const u = new URL(uri);
    return !BLOCKED_SCHEMES.has(u.protocol.toLowerCase());
  } catch {
    return false;
  }
}

/** Parse + validate the authorization query the control plane forwarded.
 *  Mirrors the server-side checks in `GET /authorize` so the screen fails
 *  closed on a malformed/hand-crafted link instead of POSTing garbage to
 *  the grant endpoint. */
export function parseConsentParams(sp: RawParams): ConsentParseResult {
  const clientId = one(sp.client_id);
  const redirectUri = one(sp.redirect_uri);
  const codeChallenge = one(sp.code_challenge);
  const responseType = one(sp.response_type) ?? "code";
  const method = one(sp.code_challenge_method) ?? "S256";

  if (!clientId || !redirectUri || !codeChallenge) {
    return { ok: false, reason: "Missing required authorization parameters." };
  }
  if (responseType !== "code") {
    return { ok: false, reason: 'Unsupported response_type (only "code").' };
  }
  if (method !== "S256") {
    return {
      ok: false,
      reason: 'Unsupported code_challenge_method (only "S256").',
    };
  }
  if (!isSafeRedirectTarget(redirectUri)) {
    return { ok: false, reason: "Invalid redirect_uri." };
  }

  return {
    ok: true,
    params: {
      clientId,
      redirectUri,
      codeChallenge,
      scope: one(sp.scope) ?? "mcp",
      state: one(sp.state),
      clientName: one(sp.client_name) || "An application",
    },
  };
}

/** Build the `redirect_uri?error=access_denied[&state=…]` URL for the deny
 *  path. Returns null when the redirect_uri isn't a safe target — the page
 *  then renders a terminal "access denied" card instead of bouncing. */
export function buildDenyRedirect(
  redirectUri: string,
  state?: string,
): string | null {
  if (!isSafeRedirectTarget(redirectUri)) return null;
  const sep = redirectUri.includes("?") ? "&" : "?";
  const st = state ? `&state=${encodeURIComponent(state)}` : "";
  return `${redirectUri}${sep}error=access_denied${st}`;
}

/** Re-assemble the `/oauth/consent?…` path from a set of params, dropping
 *  empties. Used to round-trip through `/login?from=…` when the session
 *  has expired, so the full authorization request survives sign-in. */
export function consentPath(params: {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  state?: string;
  client_name?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("client_id", params.client_id);
  qs.set("redirect_uri", params.redirect_uri);
  qs.set("code_challenge", params.code_challenge);
  qs.set("code_challenge_method", "S256");
  qs.set("response_type", "code");
  qs.set("scope", params.scope);
  if (params.state) qs.set("state", params.state);
  if (params.client_name) qs.set("client_name", params.client_name);
  return `/oauth/consent?${qs.toString()}`;
}
