/* ============================================================
   Password-reset request page (plan §5.4 / v1.18).

   Posts the email to `POST /v1/auth/forgot` — the control plane
   mints a one-shot token, hands it to the MailProvider, and the
   user gets a link. We always render the same confirmation page
   regardless of whether the email was on file, so an unauthenticated
   visitor can't enumerate the user table.

   While Cantila Mail is still infra-blocked, the control plane's
   stub MailProvider returns the reset link inline on
   `result.debugLink`. We surface it on the confirmation so the
   developer / smoke test can complete the flow without an inbox.
   The production live-MTA path never returns it.
   ============================================================ */

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { api } from "@/lib/api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.requestPasswordReset({ email: email.trim() });
      setDebugLink(res.debugLink ?? null);
      setSent(true);
    } catch {
      // Same UX on transport failures — the user can retry.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="Cantila home">
            <BrandMark size={46} />
          </Link>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Reset password
          </h1>
        </div>

        {sent ? (
          <div className="panel space-y-3 p-6 text-sm text-ink-dim">
            <p>
              If an account exists for that email, we just sent it a
              reset link. The link expires in 1 hour.
            </p>
            {debugLink ? (
              <div className="rounded-md border border-amber-400/40 bg-amber-400/5 p-3 text-xs text-amber-200">
                <p className="font-medium text-amber-100">
                  Dev mode (stub MTA wired) — your link:
                </p>
                <p className="mt-1 break-all font-mono">{debugLink}</p>
              </div>
            ) : null}
            <div className="!mt-5 border-t border-border-soft pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-ink hover:text-ember"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign-in
              </Link>
            </div>
          </div>
        ) : (
          <form className="panel space-y-4 p-6" onSubmit={onSubmit}>
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-medium text-ink-dim"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border-soft bg-bg-base px-3 py-2 text-sm text-ink outline-none focus:border-ember"
              />
            </div>
            <button
              type="submit"
              disabled={busy || email.length === 0}
              className="w-full rounded-md bg-ember px-3 py-2 text-sm font-medium text-bg-base hover:bg-ember-bright disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <div className="border-t border-border-soft pt-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-ink-dim hover:text-ember"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign-in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
