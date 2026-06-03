/* ============================================================
   OAuth consent screen (plan §4.3.2 — MCP OAuth connector).

   The last human step of the MCP "Connect via URL" flow. An MCP
   host (Claude Code, claude.ai, Cursor, …) has discovered our
   OAuth metadata, registered itself (DCR) and sent the user's
   browser to the control plane's `GET /authorize`, which 302s
   here with the authorization request in the query string.

   This page:
     1. validates the request (mirrors the control-plane checks),
     2. requires a signed-in Console session (the cookie is shared
        across *.cantila.app), bouncing to /login and back if not,
     3. on "Allow", POSTs the session-gated `/v1/oauth/grant`, which
        mints a single-use auth code and returns the host callback
        URL to redirect to,
     4. on "Deny", bounces back to the host with error=access_denied.

   No client JS — two server-action forms, mirroring /login.
   ============================================================ */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck, Check, X, Plug } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { SESSION_COOKIE, CONTROL_PLANE_URL } from "@/lib/auth";
import {
  parseConsentParams,
  buildDenyRedirect,
  consentPath,
} from "@/lib/oauth-consent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Authorize a connection · Cantila",
  robots: { index: false, follow: false },
};

/* ----- server actions ----- */

async function approve(formData: FormData) {
  "use server";
  const f = (k: string) => String(formData.get(k) ?? "");
  const clientId = f("client_id");
  const redirectUri = f("redirect_uri");
  const codeChallenge = f("code_challenge");
  const scope = f("scope") || "mcp";
  const state = formData.get("state") ? f("state") : undefined;
  const clientName = f("client_name");

  const token = cookies().get(SESSION_COOKIE)?.value;
  // Session expired between render and click — send the user through
  // sign-in and back to this exact authorization request.
  if (!token) {
    const back = consentPath({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      scope,
      state,
      client_name: clientName,
    });
    redirect(`/login?from=${encodeURIComponent(back)}`);
  }

  let redirectTo: string | undefined;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/oauth/grant`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        scope,
        ...(state ? { state } : {}),
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      redirect_to?: string;
    } | null;
    if (res.ok && data?.redirect_to) redirectTo = data.redirect_to;
  } catch {
    /* control plane unreachable — fall through to the error redirect */
  }

  if (!redirectTo) {
    const back = consentPath({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      scope,
      state,
      client_name: clientName,
    });
    redirect(`${back}&error=grant_failed`);
  }

  // External callback (host redirect_uri, possibly a custom app scheme).
  redirect(redirectTo);
}

async function deny(formData: FormData) {
  "use server";
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = formData.get("state")
    ? String(formData.get("state"))
    : undefined;
  const back = buildDenyRedirect(redirectUri, state);
  redirect(back ?? "/oauth/consent?status=denied");
}

/* ----- page ----- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 text-ink">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Terminal state: the user denied and the host had no safe callback.
  if (searchParams.status === "denied") {
    return (
      <Shell>
        <div className="panel p-6 text-center">
          <X className="mx-auto h-6 w-6 text-down" strokeWidth={2.2} />
          <h1 className="mt-3 font-display text-lg font-semibold text-ink">
            Access denied
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            No connection was authorized. You can close this tab.
          </p>
        </div>
      </Shell>
    );
  }

  const parsed = parseConsentParams(searchParams);
  if (!parsed.ok) {
    return (
      <Shell>
        <div className="panel p-6 text-center">
          <X className="mx-auto h-6 w-6 text-down" strokeWidth={2.2} />
          <h1 className="mt-3 font-display text-lg font-semibold text-ink">
            Invalid authorization request
          </h1>
          <p className="mt-1 text-sm text-ink-dim">{parsed.reason}</p>
        </div>
      </Shell>
    );
  }
  const p = parsed.params;

  // Require a signed-in session. The cookie is scoped to .cantila.app, so a
  // sign-in on the apex carries here. Preserve the full request through login.
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    const back = consentPath({
      client_id: p.clientId,
      redirect_uri: p.redirectUri,
      code_challenge: p.codeChallenge,
      scope: p.scope,
      state: p.state,
      client_name: p.clientName,
    });
    redirect(`/login?from=${encodeURIComponent(back)}`);
  }

  // Best-effort identity for the "signed in as" line — the grant is scoped
  // by the session regardless of what we render here.
  let email: string | null = null;
  let accountName: string | null = null;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const me = (await res.json()) as {
        user?: { email?: string } | null;
        account?: { name?: string } | null;
      };
      email = me.user?.email ?? null;
      accountName = me.account?.name ?? null;
    }
  } catch {
    /* identity is decorative — proceed without it */
  }

  const grantFailed = searchParams.error === "grant_failed";

  // Hidden fields shared by both forms so the server actions get the request.
  const hidden = (
    <>
      <input type="hidden" name="client_id" value={p.clientId} />
      <input type="hidden" name="redirect_uri" value={p.redirectUri} />
      <input type="hidden" name="code_challenge" value={p.codeChallenge} />
      <input type="hidden" name="scope" value={p.scope} />
      <input type="hidden" name="client_name" value={p.clientName} />
      {p.state ? (
        <input type="hidden" name="state" value={p.state} />
      ) : null}
    </>
  );

  return (
    <Shell>
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size={46} />
        <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
          Authorize a connection
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Connect an app to your Cantila account.
        </p>
      </div>

      <div className="panel p-6">
        {grantFailed && (
          <p className="mb-4 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
            Could not complete the authorization. Please try again.
          </p>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-border bg-bg px-3 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ember/10 text-ember">
            <Plug className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {p.clientName}
            </p>
            <p className="text-2xs text-ink-dim">
              wants to act on your Cantila account via the MCP connector
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-2xs text-ink-dim">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-ember" strokeWidth={2.2} />
            Scoped to{" "}
            {accountName ? (
              <span className="font-medium text-ink">{accountName}</span>
            ) : (
              "your account"
            )}
            {email ? (
              <span className="text-ink-faint">· {email}</span>
            ) : null}
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-ember" strokeWidth={2.2} />
            Access level: <span className="font-mono text-ink">{p.scope}</span>
          </li>
        </ul>

        <div className="mt-5 flex gap-2.5">
          <form action={deny} className="flex-1">
            {hidden}
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg text-sm font-medium text-ink-dim transition-colors hover:border-down/40 hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
              Deny
            </button>
          </form>
          <form action={approve} className="flex-1">
            {hidden}
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              <Check className="h-4 w-4" strokeWidth={2.4} />
              Allow
            </button>
          </form>
        </div>
      </div>

      <p className="mt-5 text-center text-2xs text-ink-faint">
        Authorizing lets {p.clientName} deploy and manage on your behalf until
        you revoke it.
      </p>
    </Shell>
  );
}
