"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  Download,
  TrendingUp,
  Wallet,
  Zap,
  Sparkles,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, Meter, Pill, cx } from "@/components/ui";
import EmbeddedCheckoutModal from "@/components/EmbeddedCheckoutModal";
import { usage, invoices, planTiers, dashboardStats } from "@/lib/mock-data";
import {
  api,
  isControlPlaneLive,
  type ApiAccount,
  type ApiBillingInvoice,
  type ApiBillingSummary,
  type ApiCheckoutTier,
  type ApiCostOptimisationReport,
  type ApiDunningStatus,
  type ApiProrationPreview,
} from "@/lib/api";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format cents with an explicit sign — `+$3.50` / `-$1.20`. */
function formatSignedUsd(cents: number): string {
  return `${cents < 0 ? "-" : "+"}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/** "pro" → "Pro" for display. */
function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function formatPeriodLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Invoice issue date — "May 25, 2026". */
function formatInvoiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Pill tone for a Stripe invoice status. */
function invoiceTone(
  status: ApiBillingInvoice["status"],
): "live" | "warn" | "down" | "neutral" {
  if (status === "paid") return "live";
  if (status === "open") return "warn";
  if (status === "uncollectible") return "down";
  return "neutral"; // draft, void
}

/** Human label for a Stripe invoice status. */
function invoiceLabel(status: ApiBillingInvoice["status"]): string {
  return status === "uncollectible"
    ? "Uncollectible"
    : status[0].toUpperCase() + status.slice(1);
}

/** Map a display plan name ("Pro") to the Stripe checkout tier enum. */
function tierForName(name: string): ApiCheckoutTier | null {
  const lower = name.toLowerCase();
  if (lower === "hobby" || lower === "starter" || lower === "pro" || lower === "agency") {
    return lower;
  }
  return null;
}

export default function BillingView() {
  const [live, setLive] = useState<ApiBillingSummary | null>(null);
  const [cost, setCost] = useState<ApiCostOptimisationReport | null>(null);
  const [account, setAccount] = useState<ApiAccount | null>(null);
  /** Billing health from the dunning state machine (plan §8 / §15.2) —
   *  drives the failed-payment banner. Null when healthy or offline. */
  const [dunning, setDunning] = useState<ApiDunningStatus | null>(null);
  /** Which Stripe rail is wired — `{label, live}` from `/v1/billing/info`.
   *  `live: false` is the stub; we render a "(stub)" badge so the operator
   *  knows clicking "Switch to Pro" doesn't actually charge anything. */
  const [railInfo, setRailInfo] = useState<{
    label: string;
    live: boolean;
    /** Stripe publishable key — present when embedded Checkout is
     *  available (plan §8.5 — Phase D). */
    publishableKey?: string;
  } | null>(null);
  /** Which AI analyser produced the cost-optimiser recommendations —
   *  `{label, live}` from `/v1/ai/info`. `live: false` is the rule-based
   *  stub; the badge says so, mirroring the deploy troubleshoot panel. */
  const [aiInfo, setAiInfo] = useState<{ label: string; live: boolean } | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  /** Which tier is currently being upgraded — drives the per-card spinner. */
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  /** True while the Stripe billing-portal session is being created. */
  const [portalOpening, setPortalOpening] = useState(false);
  /** Mid-period proration (plan §8 / §15.2). When an account already has
   *  a subscription, switching tier previews the proration here for the
   *  operator to confirm — instead of opening a fresh checkout. */
  const [prorationPreview, setProrationPreview] =
    useState<ApiProrationPreview | null>(null);
  const [prorationTier, setProrationTier] = useState<ApiCheckoutTier | null>(
    null,
  );
  /** True while the plan change is being committed. */
  const [prorationBusy, setProrationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Checkout-return state (plan §8.5.2). Hosted checkout redirects back
   *  to `/billing?checkout=…`; the `checkout.session.completed` webhook is
   *  asynchronous, so `finalizing` drives a "confirming…" banner while we
   *  poll the control plane until the subscription syncs. `synced` /
   *  `timeout` / `cancelled` are terminal. */
  const [checkoutState, setCheckoutState] = useState<
    "idle" | "finalizing" | "synced" | "timeout" | "cancelled"
  >("idle");
  /** Real Stripe invoice history (plan §8.5 — Phase B). Null until the
   *  first load resolves; an empty array means no invoices yet. */
  const [stripeInvoices, setStripeInvoices] = useState<
    ApiBillingInvoice[] | null
  >(null);
  /** Which tier's embedded Checkout modal is open (plan §8.5 — Phase D).
   *  Null when closed; embedded Checkout is used for a fresh subscribe
   *  when a real publishable key is wired, hosted redirect otherwise. */
  const [embeddedTier, setEmbeddedTier] = useState<ApiCheckoutTier | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        // `/v1/accounts/me` returns the account row directly (and works
        // unauthenticated against the default account, unlike `/v1/me`
        // which 401s without a key). We need the live account to surface
        // `stripeCustomerId` / `stripeSubscriptionId` in the payment-rail
        // panel.
        const [summary, optim, acct, rail, ai, dun, invs] =
          await Promise.all([
            api.getBillingSummary(),
            api.getCostOptimisation(),
            api.getAccountMe().catch(() => null),
            api.getBillingInfo().catch(() => null),
            api.getAiInfo().catch(() => null),
            api.getDunning().catch(() => null),
            api.getBillingInvoices().catch(() => null),
          ]);
        if (cancelled) return;
        setLive(summary);
        setCost(optim);
        if (acct) setAccount(acct);
        if (rail) setRailInfo(rail);
        if (ai) setAiInfo(ai);
        if (dun) setDunning(dun);
        if (invs) setStripeInvoices(invs.invoices);
      } catch {
        /* swallow — fall back to mock */
      }

      // Checkout-return handling (plan §8.5.2). Hosted checkout redirects
      // back to `/billing?checkout=success|cancelled`. The success webhook
      // is asynchronous, so poll the control plane — never Stripe — until
      // the subscription syncs, bridging the delivery gap.
      if (cancelled || typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      if (!checkout) return;
      // Strip the query param so a reload doesn't re-trigger the flow.
      window.history.replaceState(null, "", "/billing");
      if (checkout === "cancelled") {
        setCheckoutState("cancelled");
        return;
      }
      if (checkout !== "success") return;
      setCheckoutState("finalizing");
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;
        const synced = await api.getAccountMe().catch(() => null);
        if (synced?.stripeSubscriptionId) {
          const [freshSummary, freshDunning, freshInvoices] =
            await Promise.all([
              api.getBillingSummary().catch(() => null),
              api.getDunning().catch(() => null),
              api.getBillingInvoices().catch(() => null),
            ]);
          if (cancelled) return;
          setAccount(synced);
          if (freshSummary) setLive(freshSummary);
          if (freshDunning) setDunning(freshDunning);
          if (freshInvoices) setStripeInvoices(freshInvoices.invoices);
          setCheckoutState("synced");
          return;
        }
      }
      if (!cancelled) setCheckoutState("timeout");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout(tierName: string) {
    const tier = tierForName(tierName);
    if (!tier) {
      setError(`No checkout tier mapping for "${tierName}".`);
      return;
    }
    setError(null);
    setPendingTier(tierName);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const session = await api.createCheckoutSession({
        tier,
        // Round-trip back to /billing so the return is handled
        // deterministically — poll-until-synced (plan §8.5.1 / §8.5.2).
        successUrl: `${origin}/billing?checkout=success`,
        cancelUrl: `${origin}/billing?checkout=cancelled`,
      });
      // Same-tab redirect — a new tab would orphan the success/cancel
      // round-trip. The page unloads here; the stub URL is a safe
      // placeholder, replaced by the real Stripe-hosted page once
      // STRIPE_SECRET_KEY is set.
      if (typeof window !== "undefined") {
        window.location.assign(session.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout session failed");
      setPendingTier(null);
    }
  }

  /** Decide how a tier switch is handled. An account that already has a
   *  subscription gets a mid-period proration preview to confirm; an
   *  account with no subscription goes through hosted checkout. */
  async function switchToPlan(tierName: string) {
    const tier = tierForName(tierName);
    if (!tier) {
      setError(`No plan mapping for "${tierName}".`);
      return;
    }
    if (!account?.stripeSubscriptionId) {
      // No subscription yet — a fresh checkout, not a proration. Use
      // embedded Checkout when a real publishable key is wired (plan
      // §8.5 — Phase D); fall back to the hosted redirect otherwise.
      if (railInfo?.publishableKey) {
        setError(null);
        setEmbeddedTier(tier);
      } else {
        await startCheckout(tierName);
      }
      return;
    }
    setError(null);
    setPendingTier(tierName);
    try {
      const preview = await api.previewPlanChange(tier);
      setProrationPreview(preview);
      setProrationTier(tier);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not preview the plan change",
      );
    } finally {
      setPendingTier(null);
    }
  }

  /** Commit the previewed plan change, then reload the billing surfaces. */
  async function confirmPlanChange() {
    if (!prorationTier) return;
    setProrationBusy(true);
    setError(null);
    try {
      await api.changePlan({ tier: prorationTier });
      const [summary, acct] = await Promise.all([
        api.getBillingSummary(),
        api.getAccountMe().catch(() => null),
      ]);
      setLive(summary);
      if (acct) setAccount(acct);
      setCurrentPlan(titleCase(prorationTier));
      setProrationPreview(null);
      setProrationTier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setProrationBusy(false);
    }
  }

  /** Dismiss the proration preview without changing plan. */
  function cancelPlanChange() {
    setProrationPreview(null);
    setProrationTier(null);
  }

  /** Open the Stripe billing portal — the hosted page where the customer
   *  updates their payment method, downloads invoices and manages the
   *  plan. Opens in a new tab so the operator keeps the Console open. */
  async function openBillingPortal() {
    setError(null);
    setPortalOpening(true);
    try {
      const session = await api.createBillingPortalSession();
      if (typeof window !== "undefined") {
        window.open(session.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open billing portal",
      );
    } finally {
      setPortalOpening(false);
    }
  }

  const defaultName = live?.plan.name ?? planTiers.find((t) => t.current)?.name ?? "Pro";
  const [currentPlan, setCurrentPlan] = useState<string>(defaultName);

  // When the live summary lands after mount, adopt its plan as the default.
  useEffect(() => {
    if (live?.plan.name) setCurrentPlan(live.plan.name);
  }, [live?.plan.name]);

  // Refresh-on-focus (plan §8.5.2) — a Stripe webhook (e.g. a `past_due`
  // from a failed charge) can land while the operator sits on this page.
  // Re-pull the cheap control-plane reads when the tab regains focus so
  // the dunning banner and rail-status panel stay current. No Stripe call.
  useEffect(() => {
    if (liveMode !== true) return;
    function refresh() {
      void (async () => {
        const [dun, acct, rail] = await Promise.all([
          api.getDunning().catch(() => null),
          api.getAccountMe().catch(() => null),
          api.getBillingInfo().catch(() => null),
        ]);
        if (dun) setDunning(dun);
        if (acct) setAccount(acct);
        if (rail) setRailInfo(rail);
      })();
    }
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [liveMode]);

  // Plan tier list — live catalog when available, mock seed otherwise.
  const tiers = live
    ? live.catalog.map((p) => ({
        name: p.name,
        price: p.priceCents === 0 ? "$0" : `$${Math.round(p.priceCents / 100)}`,
        tagline: p.tagline,
        current: p.name === currentPlan,
      }))
    : planTiers;

  const active = tiers.find((t) => t.name === currentPlan);

  // Usage rows — live takes precedence; mock seed kept as offline fallback.
  const usageRows = live
    ? live.usage.map((u) => ({
        label: u.label,
        used: u.used,
        limit: u.limit,
        unit: u.unit,
      }))
    : usage;

  // Invoice rows — synthesize from live recent charges; mock seed otherwise.
  const invoiceRows = live
    ? live.recentCharges.map((c) => ({
        id: c.id,
        period: formatPeriodLabel(c.at),
        amount: formatUsd(c.amountCents),
        note: c.description,
        status: "Paid" as const,
      }))
    : invoices;

  const monthSpend = live
    ? formatUsd(live.monthToDateCents)
    : dashboardStats.monthSpend;
  const projected = live ? formatUsd(live.projectedCents) : "~$88";

  // Plan §5.5 — when this account is rolled up onto a parent, its
  // own billing surface is informational only — the parent owns the
  // payment instrument. The banner explains the situation and points
  // at the parent.
  const billedToParent = account?.billedToAccountId;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={liveMode ? "Account · live billing" : "Account"}
        title="Billing & usage"
        lead="A subscription plus metered usage — with spend caps and budget alerts on by default."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> live usage
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                control plane offline · mock numbers
              </span>
            )}
            <button
              onClick={() => void openBillingPortal()}
              disabled={portalOpening}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-50"
            >
              {portalOpening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {portalOpening ? "Opening…" : "Payment method"}
            </button>
          </div>
        }
      />

      {/* Plan §5.5 — billing-rollup notice. Shown when this account
          is rolled up onto a parent; checkout / plan-change / portal
          all 400 against it because the parent owns the bill. */}
      {billedToParent && (
        <div className="panel border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex flex-col gap-1 text-amber-100">
            <div className="font-semibold">
              This account is billed via parent{" "}
              <code className="font-mono text-amber-200">{billedToParent}</code>
              .
            </div>
            <div className="text-2xs text-amber-200/80">
              Charges that would normally land on this account&apos;s Stripe
              subscription (phone-number leases, plan-tier fees) are routed to
              the parent&apos;s subscription instead. Checkout, plan change and
              the billing portal are disabled for this account — manage payment
              from the parent workspace.
            </div>
          </div>
        </div>
      )}

      {/* error banner — checkout-session failures land here */}
      {error && (
        <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-2xs text-down">
          {error}
        </div>
      )}

      {/* checkout-return banner (plan §8.5.2) — bridges the async gap
          between a hosted-checkout redirect-back and the Stripe webhook
          landing. `finalizing` polls the control plane until synced. */}
      {checkoutState === "finalizing" && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-surface-2 px-4 py-3 text-xs text-ink-dim">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span className="font-medium text-ink">Finalising your upgrade…</span>
          <span>Confirming the payment with Stripe — this takes a few seconds.</span>
        </div>
      )}
      {checkoutState === "synced" && (
        <div className="flex items-center gap-2 rounded-lg border border-live/40 bg-live/10 px-4 py-3 text-xs text-live">
          <Check className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            Upgrade confirmed — your new plan is active.
          </span>
        </div>
      )}
      {checkoutState === "timeout" && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-xs text-warn">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Payment received.</span>
          <span className="text-ink-dim">
            Your plan will update here shortly — reload the page in a moment.
          </span>
        </div>
      )}
      {checkoutState === "cancelled" && (
        <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-xs text-ink-dim">
          Checkout cancelled — no charge was made.
        </div>
      )}

      {/* dunning banner (plan §8 / §15.2) — a failed-payment cycle.
          past_due is a recoverable warning; suspended / canceled is an
          error and means new deploys are blocked. */}
      {dunning && dunning.billingStatus !== "active" && (
        <div
          className={cx(
            "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-4 py-3 text-xs",
            dunning.billingStatus === "past_due"
              ? "border-warn/40 bg-warn/10 text-warn"
              : "border-down/40 bg-down/10 text-down",
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            {dunning.billingStatus === "past_due"
              ? `Payment past due — attempt ${dunning.dunningAttempts} of ${dunning.policy.maxAttempts} failed.`
              : dunning.billingStatus === "suspended"
                ? "Account suspended for non-payment — new deploys are paused."
                : "Account canceled for non-payment — reactivate billing to deploy."}
          </span>
          <span className="text-ink-dim">
            {dunning.billingStatus === "past_due" && dunning.graceEndsAt
              ? `Update your payment method by ${new Date(
                  dunning.graceEndsAt,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })} to avoid suspension.`
              : "Update your payment method to restore full access."}
          </span>
          <button
            onClick={() => void openBillingPortal()}
            disabled={portalOpening}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-current px-3 text-2xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {portalOpening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Update payment method
          </button>
        </div>
      )}

      {/* payment-rail status — surfaces which adapter is wired (stub
          vs live Stripe), whether the customer is linked, and which
          subscription is active. The Console treats a missing
          stripeCustomerId as "rail set up but not yet linked" (the
          back-fill happens on the first checkout). */}
      {account && (
        <div className="panel flex flex-wrap items-center gap-3 px-5 py-3 text-2xs">
          <span className="kv text-ink-dim">Payment rail</span>
          {railInfo && (
            <Pill tone={railInfo.live ? "live" : "warn"}>
              {railInfo.live ? railInfo.label : `${railInfo.label} (stub)`}
            </Pill>
          )}
          <span className="text-ink-faint">·</span>
          {account.stripeCustomerId ? (
            <>
              <Pill tone="live">customer linked</Pill>
              <code className="font-mono text-ink-faint">
                {account.stripeCustomerId}
              </code>
            </>
          ) : (
            <Pill tone="warn">no customer yet — first switch will create one</Pill>
          )}
          {account.stripeSubscriptionId && (
            <>
              <span className="text-ink-faint">·</span>
              <span className="text-ink-dim">subscription</span>
              <code className="font-mono text-ink-faint">
                {account.stripeSubscriptionId}
              </code>
            </>
          )}
        </div>
      )}

      {/* summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel relative overflow-hidden p-5">
          <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-20" />
          <div className="relative">
            <div className="kv">Current plan</div>
            <div className="mt-1.5 font-display text-2xl font-semibold text-ink">
              {currentPlan}
            </div>
            <div className="mt-0.5 text-2xs text-ink-faint">
              {active?.price ?? "$0"} / mo · billed monthly
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="kv inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            Month-to-date
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold text-ink">
            {monthSpend}
          </div>
          <div className="mt-0.5 text-2xs text-ink-faint">
            plan + metered usage
          </div>
        </div>
        <div className="panel p-5">
          <div className="kv inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Projected
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold text-ink">
            {projected}
          </div>
          <div className="mt-0.5 text-2xs text-ink-faint">
            {live
              ? `renews ${formatPeriodLabel(live.periodEnd)} · linear projection`
              : "renews Jun 1 · cap $150"}
          </div>
        </div>
      </div>

      {/* mid-period proration preview (plan §8 / §15.2) — shown when an
          account with an existing subscription switches tier, instead of
          opening a fresh checkout. */}
      {prorationPreview && prorationTier && (
        <div className="panel border-ember/40 p-5 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">
              Switch to {titleCase(prorationPreview.toTier)}
            </h2>
            <Pill tone={prorationPreview.isUpgrade ? "ember" : "live"}>
              {prorationPreview.isUpgrade ? "upgrade" : "downgrade"}
            </Pill>
          </div>
          <div className="mt-3 divide-y divide-border-soft">
            {prorationPreview.lines.map((l, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 text-2xs"
              >
                <span className="text-ink-dim">{l.description}</span>
                <span className="font-mono text-ink">
                  {formatSignedUsd(l.amountCents)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 text-sm font-semibold">
              <span className="text-ink">
                {prorationPreview.amountDueCents >= 0
                  ? "Due now"
                  : "Credited to your next invoice"}
              </span>
              <span className="font-mono text-ember">
                {formatSignedUsd(prorationPreview.amountDueCents)}
              </span>
            </div>
          </div>
          <p className="mt-1 text-2xs text-ink-faint">
            {Math.round(prorationPreview.remainingFraction * 100)}% of the
            billing period remains · the proration rolls onto your next
            invoice ·{" "}
            {prorationPreview.source === "stripe"
              ? "figures confirmed by Stripe"
              : "estimated figures"}
            .
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void confirmPlanChange()}
              disabled={prorationBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
            >
              {prorationBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm switch to {titleCase(prorationPreview.toTier)}
            </button>
            <button
              onClick={cancelPlanChange}
              disabled={prorationBusy}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* plan tiers */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => {
            const isCurrent = t.name === currentPlan;
            return (
              <div
                key={t.name}
                className={cx(
                  "panel flex flex-col gap-3 p-5 transition-all",
                  isCurrent && "border-ember/40 shadow-glow",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold text-ink">
                    {t.name}
                  </span>
                  {isCurrent && <Pill tone="ember">Current</Pill>}
                </div>
                <div>
                  <span className="font-display text-2xl font-semibold text-ink">
                    {t.price}
                  </span>
                  <span className="text-2xs text-ink-faint"> / mo</span>
                </div>
                <p className="text-2xs text-ink-faint">{t.tagline}</p>
                <button
                  disabled={
                    isCurrent || pendingTier !== null || prorationBusy
                  }
                  onClick={() => void switchToPlan(t.name)}
                  className={cx(
                    "mt-auto inline-flex h-8 items-center justify-center gap-1 rounded-lg text-2xs font-semibold transition-colors",
                    isCurrent
                      ? "cursor-default border border-border bg-surface-2 text-ink-faint"
                      : pendingTier === t.name
                        ? "bg-ember/40 text-[#1a0e08]"
                        : "bg-ember text-[#1a0e08] hover:bg-ember-bright disabled:opacity-50",
                  )}
                >
                  {isCurrent ? (
                    "Active plan"
                  ) : pendingTier === t.name ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Working…
                    </>
                  ) : (
                    <>
                      Switch to {t.name}
                      {/* An existing subscriber prorates in-app; a new
                          subscriber is sent to hosted checkout. */}
                      {account?.stripeSubscriptionId ? null : (
                        <ExternalLink className="h-3 w-3" />
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* usage meters */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Metered usage
          {live
            ? ` · ${formatPeriodLabel(live.periodStart)}`
            : " · May 2026"}
        </h2>
        <div className="panel divide-y divide-border-soft p-0">
          {usageRows.map((u) => {
            const pct = (u.used / u.limit) * 100;
            return (
              <div key={u.label} className="px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-ink">{u.label}</span>
                  <span className="font-mono text-2xs text-ink-dim">
                    {u.used.toLocaleString()} / {u.limit.toLocaleString()}{" "}
                    {u.unit}
                  </span>
                </div>
                <Meter
                  value={pct}
                  tone={pct > 95 ? "down" : pct > 80 ? "warn" : "ember"}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* AI cost optimiser (plan §5.6) */}
      {cost && cost.recommendations.length > 0 && (
        <section>
          <h2 className="kv mb-3 flex flex-wrap items-center gap-2 text-ink-dim">
            <Sparkles className="h-3 w-3 text-ember" />
            Recommended optimisations · est.{" "}
            <span className="text-ember">
              ${(cost.totalSavingsCentsPerMonth / 100).toFixed(2)} / mo
            </span>
            {aiInfo && (
              <span
                className={cx(
                  "rounded px-1.5 py-0.5 font-mono text-[0.6rem] normal-case tracking-normal",
                  aiInfo.live
                    ? "bg-live/10 text-live"
                    : "bg-surface-3 text-ink-faint",
                )}
                title="Which analyser produced these recommendations"
              >
                via {aiInfo.label}
                {!aiInfo.live && " (stub)"}
              </span>
            )}
          </h2>
          <div className="panel divide-y divide-border-soft p-0">
            {cost.recommendations.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                          r.confidence === "high"
                            ? "bg-ember/15 text-ember"
                            : r.confidence === "medium"
                              ? "bg-warn/15 text-warn"
                              : "bg-surface-3 text-ink-faint",
                        )}
                      >
                        {r.confidence}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        {r.title}
                      </span>
                    </div>
                    <p className="mt-1 text-2xs leading-relaxed text-ink-dim">
                      {r.body}
                    </p>
                    {r.actions && r.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {r.actions.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded border border-border-soft bg-surface-2 px-2 py-1.5"
                          >
                            <span className="rounded bg-ember/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-ember">
                              {a.label}
                            </span>
                            <code className="break-all font-mono text-2xs text-ink-dim">
                              {a.hint}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-ember">
                    ~${(r.savingsCentsPerMonth / 100).toFixed(2)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* current-period estimate (plan §8.5.1) — these are the synthesised
          line items getBillingSummary returns, NOT real Stripe invoices.
          The "Invoices" section below renders the real Stripe-sourced
          invoices (GET /v1/billing/invoices) with PDF + hosted-page links. */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Current period — estimate
          {live ? ` · ${formatPeriodLabel(live.periodStart)}` : ""}
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {invoiceRows.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink-dim">{inv.note}</div>
                  <div className="text-2xs text-ink-faint">{inv.period}</div>
                </div>
                <span className="font-mono text-sm text-ink">{inv.amount}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border-soft px-5 py-3 text-2xs text-ink-faint">
            <span className="min-w-0 flex-1">
              Estimated line items for the current period — not a paid
              invoice. Itemised invoices and PDF receipts live in the Stripe
              billing portal.
            </span>
            <button
              onClick={() => void openBillingPortal()}
              disabled={portalOpening}
              className="inline-flex items-center gap-1 font-medium text-ink-dim transition-colors hover:text-ink disabled:opacity-50"
            >
              <ExternalLink className="h-3 w-3" />
              Billing portal
            </button>
          </div>
        </div>
      </section>

      {/* invoices (plan §8.5 — Phase B) — real Stripe invoice history from
          GET /v1/billing/invoices (stripe.invoices.list). Distinct from
          the "Current period — estimate" above: these are finalised
          invoices with Stripe-hosted view + PDF links. Hidden entirely
          when the control plane is offline (stripeInvoices stays null). */}
      {stripeInvoices !== null && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Invoices</h2>
          <div className="panel overflow-hidden p-0">
            {stripeInvoices.length === 0 ? (
              <div className="px-5 py-8 text-center text-2xs text-ink-faint">
                No invoices yet — your first Stripe invoice appears here
                once you subscribe to a paid plan.
              </div>
            ) : (
              <div className="divide-y divide-border-soft">
                {stripeInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs text-ink">
                          {inv.number ?? inv.id}
                        </span>
                        <span className="text-ink-faint">·</span>
                        <span className="text-sm text-ink-dim">
                          {formatInvoiceDate(inv.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-sm text-ink">
                      {formatUsd(inv.amountCents)}
                    </span>
                    <span className="hidden sm:inline-flex">
                      <Pill tone={invoiceTone(inv.status)}>
                        {invoiceLabel(inv.status)}
                      </Pill>
                    </span>
                    {inv.hostedInvoiceUrl && (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View invoice"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint transition-colors hover:text-ink"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {inv.invoicePdfUrl && (
                      <a
                        href={inv.invoicePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download PDF"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint transition-colors hover:text-ink"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* embedded Checkout (plan §8.5 — Phase D) — mounted in-page for a
          fresh subscribe when a real Stripe publishable key is wired. */}
      {embeddedTier && railInfo?.publishableKey && (
        <EmbeddedCheckoutModal
          tier={embeddedTier}
          publishableKey={railInfo.publishableKey}
          onClose={() => setEmbeddedTier(null)}
        />
      )}
    </div>
  );
}
