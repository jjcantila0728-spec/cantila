/* ============================================================
   Invite accept page (plan §5.4 — per-user invite flow).

   Anyone with a token can land here — middleware lets /invite/*
   through unauthenticated, and the control plane exempts
   /v1/invites/by-token/* + POST /v1/invites/accept from the
   API-key gate. The form submits to a server action that calls
   /v1/invites/accept and, on success, sets the same
   cantila_session cookie the login flow uses — so the new user
   lands inside the Console pinned to the inviting account.
   ============================================================ */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Rocket, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { SESSION_COOKIE, CONTROL_PLANE_URL } from "@/lib/auth";

export const metadata = { title: "Accept invite · Cantila Console" };

interface PublicInvite {
  id: string;
  email: string;
  role: "owner" | "admin" | "developer" | "viewer";
  accountId: string;
  accountName: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
}

/** Look up the invite by token. The route is unauthenticated and never
 *  echoes the raw token back. */
async function fetchInvite(token: string): Promise<PublicInvite | string> {
  try {
    const res = await fetch(
      `${CONTROL_PLANE_URL}/v1/invites/by-token/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (res.status === 404) return "invite not found";
    if (!res.ok) return "could not load invite";
    return (await res.json()) as PublicInvite;
  } catch {
    return "could not reach the control plane";
  }
}

/** Server action: POST the token to the control plane, set the cookie
 *  on success, otherwise bounce back to /invite/[token] with ?error=… */
async function acceptInvite(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!token) redirect(`/invite/?error=missing-token`);

  const failure = (msg: string) =>
    redirect(`/invite/${token}?error=${encodeURIComponent(msg)}`);

  let result: { token?: string; expiresAt?: string; error?: unknown } | null;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/invites/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        name: name || undefined,
        password: password || undefined,
      }),
      cache: "no-store",
    });
    result = (await res.json().catch(() => null)) as typeof result;
    if (!res.ok || !result || typeof result.token !== "string") {
      const msg =
        result && typeof result.error === "string"
          ? result.error
          : "could not accept";
      return failure(msg);
    }
  } catch {
    return failure("could not reach the control plane");
  }

  cookies().set(SESSION_COOKIE, result.token!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: result.expiresAt ? new Date(result.expiresAt) : undefined,
  });
  redirect("/dashboard");
}

const ROLE_LABEL: Record<PublicInvite["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
};

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const invite = await fetchInvite(params.token);
  const error =
    typeof searchParams.error === "string" ? searchParams.error : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={46} />
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Join the workspace
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Accept your invite to the Cantila Console.
          </p>
        </div>

        <div className="panel p-6">
          {typeof invite === "string" ? (
            <p className="rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-sm text-down">
              {invite}
            </p>
          ) : invite.status !== "pending" ? (
            <p className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
              This invite is {invite.status}. Ask the inviter to send a fresh
              one.
            </p>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-border bg-surface-2 px-3 py-3 text-2xs leading-relaxed text-ink-dim">
                <div className="flex items-center gap-1.5 text-ink">
                  <ShieldCheck className="h-3.5 w-3.5 text-live" />
                  <span className="font-semibold">
                    {invite.accountName}
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xs text-ink-faint">
                  {invite.email} · {ROLE_LABEL[invite.role]}
                </div>
                <div className="mt-1 font-mono text-2xs text-ink-faint">
                  Expires {new Date(invite.expiresAt).toLocaleString()}
                </div>
              </div>

              {error && (
                <p className="mb-4 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
                  {error}
                </p>
              )}

              <form action={acceptInvite} className="space-y-3.5">
                <input type="hidden" name="token" value={params.token} />
                <label className="block">
                  <span className="kv">Full name</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="Alex Rivera"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
                  />
                </label>
                <label className="block">
                  <span className="kv">
                    Password{" "}
                    <span className="text-ink-faint">
                      (optional — SSO works too)
                    </span>
                  </span>
                  <input
                    type="password"
                    name="password"
                    placeholder="Choose a password"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember"
                  />
                </label>

                <button
                  type="submit"
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
                >
                  Accept invite
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-2xs text-ink-faint">
          <Rocket className="h-3 w-3 text-ember" />
          Accepting binds your account to the inviting workspace.
        </p>
      </div>
    </div>
  );
}
