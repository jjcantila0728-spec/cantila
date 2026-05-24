import { CreditCard, Check, Download, TrendingUp, Wallet } from "lucide-react";
import { PageHeader, Meter, Pill, cx } from "@/components/ui";
import { usage, invoices, planTiers, dashboardStats } from "@/lib/mock-data";

export const metadata = { title: "Billing · Cantila Console" };

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Billing & usage"
        lead="A subscription plus metered usage — with spend caps and budget alerts on by default."
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:border-ink-faint">
            <CreditCard className="h-4 w-4" />
            Payment method
          </button>
        }
      />

      {/* summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel relative overflow-hidden p-5">
          <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-20" />
          <div className="relative">
            <div className="kv">Current plan</div>
            <div className="mt-1.5 font-display text-2xl font-semibold text-ink">
              Pro
            </div>
            <div className="mt-0.5 text-2xs text-ink-faint">
              $35 / mo · billed monthly
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="kv inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            Month-to-date
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold text-ink">
            {dashboardStats.monthSpend}
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
            ~$88
          </div>
          <div className="mt-0.5 text-2xs text-ink-faint">
            renews Jun 1 · cap $150
          </div>
        </div>
      </div>

      {/* plan tiers */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {planTiers.map((t) => (
            <div
              key={t.name}
              className={cx(
                "panel flex flex-col gap-3 p-5",
                t.current && "border-ember/40 shadow-glow",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-semibold text-ink">
                  {t.name}
                </span>
                {t.current && <Pill tone="ember">Current</Pill>}
              </div>
              <div>
                <span className="font-display text-2xl font-semibold text-ink">
                  {t.price}
                </span>
                <span className="text-2xs text-ink-faint"> / mo</span>
              </div>
              <p className="text-2xs text-ink-faint">{t.tagline}</p>
              <button
                disabled={t.current}
                className={cx(
                  "mt-auto h-8 rounded-lg text-2xs font-semibold transition-colors",
                  t.current
                    ? "cursor-default border border-border bg-surface-2 text-ink-faint"
                    : "bg-ember text-[#1a0e08] hover:bg-ember-bright",
                )}
              >
                {t.current ? "Active plan" : `Switch to ${t.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* usage meters */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Metered usage · May 2026</h2>
        <div className="panel divide-y divide-border-soft p-0">
          {usage.map((u) => {
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
                  tone={pct > 80 ? "warn" : pct > 95 ? "down" : "ember"}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* invoices */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Invoices</h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink">
                      {inv.id}
                    </span>
                    <span className="text-ink-faint">·</span>
                    <span className="text-sm text-ink-dim">{inv.period}</span>
                  </div>
                  <div className="text-2xs text-ink-faint">{inv.note}</div>
                </div>
                <span className="font-mono text-sm text-ink">
                  {inv.amount}
                </span>
                <span
                  className={cx(
                    "hidden sm:inline-flex",
                  )}
                >
                  {inv.status === "Paid" ? (
                    <Pill tone="live">
                      <Check className="h-3 w-3" />
                      Paid
                    </Pill>
                  ) : (
                    <Pill tone="warn">Open</Pill>
                  )}
                </span>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint hover:text-ink">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
