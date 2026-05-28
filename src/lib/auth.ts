/* ============================================================
   Console auth constants (plan §5.4 — per-user OIDC/SSO auth).

   The session cookie holds the raw token minted by the control
   plane's POST /v1/auth/login. The middleware checks it to gate
   the (console) routes; the login page and logout route set and
   clear it. Edge-safe — only string constants and process.env.
   ============================================================ */

/** Name of the httpOnly cookie that carries the session token. */
export const SESSION_COOKIE = "cantila_session";

/** Where the Console reaches the control plane server-side. Mirrors the
 *  /api/cantila proxy route and the /status page. */
export const CONTROL_PLANE_URL =
  process.env.CANTILA_CONTROL_PLANE_URL ?? "http://localhost:8080";
