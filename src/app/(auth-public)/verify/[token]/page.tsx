/* ============================================================
   Email-verify completion page (plan §5.4 / v1.18).

   The user lands here from the link in the verify email; we
   immediately submit the token to `POST /v1/auth/verify-email/confirm`
   (no extra interaction needed — the URL itself is the credential).
   On success: a short confirmation + Continue button. On failure
   (expired / wrong / already used): a generic error + a "request
   a new link" button.

   The endpoint is exempt from auth so this works even when the
   click-through arrives on a signed-out device.
   ============================================================ */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { api } from "@/lib/api";

type Phase = "loading" | "ok" | "error";

export default function VerifyEmailPage({
  params,
}: {
  params: { token: string };
}) {
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.completeEmailVerification({ token: params.token });
        if (!cancelled) setPhase("ok");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

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
            {phase === "ok"
              ? "Email verified"
              : phase === "error"
                ? "Verification failed"
                : "Verifying your email"}
          </h1>
        </div>

        <div className="panel space-y-3 p-6 text-sm text-ink-dim">
          {phase === "loading" ? (
            <p>Working…</p>
          ) : phase === "ok" ? (
            <>
              <p className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Your email address is confirmed.
              </p>
              <p>
                You can close this tab, or jump back to your dashboard.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-ember px-3 py-2 text-sm font-medium text-bg-base hover:bg-ember-bright"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="h-4 w-4" />
                This verification link is invalid or has expired.
              </p>
              <p>
                Sign in and request a fresh link from your account
                settings.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-ember px-3 py-2 text-sm font-medium text-bg-base hover:bg-ember-bright"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
