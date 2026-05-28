"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Loader2, X } from "lucide-react";
import { api, type ApiCheckoutTier } from "@/lib/api";

/**
 * Stripe embedded Checkout, mounted in-page (plan §8.5 — Phase D).
 *
 * The control plane creates the session (`uiMode: "embedded"`) and returns
 * a `clientSecret`; the publishable key arrives via `/v1/billing/info`.
 * The Console never holds a Stripe secret key — only the publishable key,
 * which is safe to expose by design. On completion Stripe redirects the
 * page to the session's `return_url` (`/billing?checkout=success`), which
 * the Billing page's poll-on-return (Phase A) already handles — so this
 * component needs no completion callback.
 */
export default function EmbeddedCheckoutModal({
  tier,
  publishableKey,
  onClose,
}: {
  tier: ApiCheckoutTier;
  publishableKey: string;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `loadStripe` is memoised so the SDK loads exactly once per mount.
  const [stripePromise] = useState<Promise<Stripe | null>>(() =>
    loadStripe(publishableKey),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const session = await api.createCheckoutSession({
          tier,
          uiMode: "embedded",
          returnUrl: `${origin}/billing?checkout=success`,
        });
        if (cancelled) return;
        if (session.uiMode !== "embedded" || !session.clientSecret) {
          setError("Embedded checkout is not available — please try again.");
          return;
        }
        setClientSecret(session.clientSecret);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Checkout session failed",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">
            Complete your upgrade
          </h2>
          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-2">
          {error ? (
            <div className="px-4 py-10 text-center text-sm text-down">
              {error}
            </div>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-ink-dim">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading secure checkout…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
