/* ============================================================
   Password-reset completion page (plan §5.4 / v1.18).

   The user lands here from the link in the reset email. We
   collect a new password and post it to `POST /v1/auth/reset-password`
   along with the URL token. The control plane verifies the token
   (single-use, 1h TTL) and writes the new password hash.

   On success: redirect to /login with a "Password updated" flash.
   On failure: render a generic "this link is invalid or expired"
   panel — the control plane collapses all error shapes, so the
   user can't tell whether the token was wrong vs. the password
   was too short.
   ============================================================ */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { api } from "@/lib/api";

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      try {
        await api.completePasswordReset({
          token: params.token,
          newPassword: pw,
        });
        router.replace("/login?reset=ok");
      } catch {
        setError(
          "This reset link is invalid or has expired. Request a new one from /forgot.",
        );
      }
    });
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
            Choose a new password
          </h1>
        </div>

        <form className="panel space-y-4 p-6" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="reset-pw"
              className="block text-xs font-medium text-ink-dim"
            >
              New password
            </label>
            <input
              id="reset-pw"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 w-full rounded-md border border-border-soft bg-bg-base px-3 py-2 text-sm text-ink outline-none focus:border-ember"
            />
          </div>
          <div>
            <label
              htmlFor="reset-confirm"
              className="block text-xs font-medium text-ink-dim"
            >
              Confirm new password
            </label>
            <input
              id="reset-confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border border-border-soft bg-bg-base px-3 py-2 text-sm text-ink outline-none focus:border-ember"
            />
          </div>
          {error ? (
            <p className="text-xs text-rose-300">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || pw.length === 0}
            className="w-full rounded-md bg-ember px-3 py-2 text-sm font-medium text-bg-base hover:bg-ember-bright disabled:opacity-50"
          >
            {busy ? "Updating…" : "Update password"}
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
      </div>
    </div>
  );
}
