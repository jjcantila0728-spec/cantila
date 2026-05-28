/* ============================================================
   Console sign-in (plan §5.4 — per-user OIDC/SSO auth).

   The form submits to a server action that calls the control
   plane's /v1/auth/* endpoints, then sets the `cantila_session`
   cookie the middleware checks. Two submit buttons share one form:
   "Enter the Console" → password sign-in; "Continue with SSO" →
   the SSO provider (a stub today — see src/auth/sso.ts on the
   control plane).
   ============================================================ */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Github, Rocket } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { SESSION_COOKIE, CONTROL_PLANE_URL } from "@/lib/auth";

export const metadata = { title: "Sign in · Cantila Console" };

/** Clamp a redirect target to a safe in-app path. */
function safeFrom(from: string | undefined | null): string {
  return typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//")
    ? from
    : "/dashboard";
}

/** POST to a control-plane auth endpoint and, on success, set the
 *  session cookie. Returns an error string on failure (the caller
 *  redirects back to /login with it). */
async function establishSession(
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
  cookies().set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: data.expiresAt ? new Date(data.expiresAt) : undefined,
  });
  return null;
}

/** Email + password sign-in. */
async function signInWithPassword(formData: FormData) {
  "use server";
  const error = await establishSession("/auth/login", {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error)}`);
  redirect(safeFrom(formData.get("from") as string | null));
}

/** SSO sign-in. The bundled stub provider authenticates by the email
 *  in the form; a real OIDC provider would start a redirect flow. */
async function signInWithSso(formData: FormData) {
  "use server";
  const error = await establishSession("/auth/sso/login", {
    email: String(formData.get("email") ?? ""),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error)}`);
  redirect(safeFrom(formData.get("from") as string | null));
}

/** Best-effort fetch of which SSO provider is wired, so the page can
 *  reflect a real OIDC IdP vs the bundled stub. Never throws. */
async function fetchSsoInfo(): Promise<{ label: string; live: boolean }> {
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  // Already signed in — skip the form.
  if (cookies().has(SESSION_COOKIE)) redirect("/dashboard");

  const sso = await fetchSsoInfo();

  const from =
    typeof searchParams.from === "string" &&
    searchParams.from.startsWith("/") &&
    !searchParams.from.startsWith("//")
      ? searchParams.from
      : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* atmosphere */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />

      <div className="relative w-full max-w-sm">
        {/* brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={46} />
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Cantila Console
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Ship anything, live — from one chat.
          </p>
        </div>

        {/* card */}
        <div className="panel p-6">
          {error && (
            <p className="mb-4 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
              {error}
            </p>
          )}

          <form action={signInWithPassword} className="space-y-3.5">
            <input type="hidden" name="from" value={from} />
            <label className="block">
              <span className="kv">Email</span>
              <input
                type="email"
                name="email"
                required
                defaultValue="jjcantila0728@gmail.com"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
              />
            </label>
            <label className="block">
              <span className="kv">Password</span>
              <input
                type="password"
                name="password"
                required
                defaultValue="prototype"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember"
              />
            </label>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              Enter the Console
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </button>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border-soft" />
              <span className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
                or
              </span>
              <span className="h-px flex-1 bg-border-soft" />
            </div>

            {/* Same form — the SSO action reads the email above. A button's
                formAction overrides the form's action. */}
            <button
              type="submit"
              formAction={signInWithSso}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
            >
              <Github className="h-4 w-4" />
              Continue with SSO
            </button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-2xs text-ink-faint">
          <Rocket className="h-3 w-3 text-ember" />
          {sso.live
            ? `MVP prototype — sign-in mints a real session; SSO via ${sso.label}.`
            : "MVP prototype — sign-in mints a real session; the SSO provider is a stub."}
        </p>
      </div>
    </div>
  );
}
