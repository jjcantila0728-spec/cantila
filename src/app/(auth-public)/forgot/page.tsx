/* ============================================================
   Password-reset placeholder.

   The reset flow needs Cantila Mail to deliver the reset link
   (the control-plane MailProvider is still infra-blocked, see
   Cantila_Complete_Plan.md §15.2). Until Mail lands we show
   a single honest paragraph and a recovery path — email JJ.
   This is the "honest about the seams" principle from
   brand/voice.md §4 made literal.
   ============================================================ */

import Link from "next/link";
import { ArrowLeft, Rocket } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";

export const metadata = { title: "Reset password · Cantila" };

export default function ForgotPage() {
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

        <div className="panel space-y-3 p-6 text-sm text-ink-dim">
          <p>
            Self-service reset lands when Cantila Mail ships — it needs the
            mail server to deliver the reset link, and that piece is still
            being wired up.
          </p>
          <p>
            In the meantime, email{" "}
            <a
              href="mailto:founder@cantila.app?subject=Reset%20my%20password"
              className="text-ember hover:text-ember-bright"
            >
              founder@cantila.app
            </a>
            . JJ resets it by hand within the day.
          </p>

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

        <p className="mt-5 flex items-center justify-center gap-1.5 text-2xs text-ink-faint">
          <Rocket className="h-3 w-3 text-ember" />
          Cantila Mail · Phase 2 — see{" "}
          <Link href="/changelog" className="hover:text-ink hover:underline">
            changelog
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
