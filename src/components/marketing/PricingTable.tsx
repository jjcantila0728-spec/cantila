import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_TIERS } from "@/data/plan-tiers";
import type { ApiPublicPlanTier } from "@/lib/api";

export default function PricingTable({
  tiers = PLAN_TIERS,
}: {
  tiers?: ApiPublicPlanTier[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
      {tiers.map((tier) => {
        const featured = tier.featured === true;
        return (
          <div
            key={tier.slug}
            className={`flex flex-col rounded-2xl border p-6 ${
              featured
                ? "border-ember-on-light/40 bg-light-bg shadow-[0_22px_60px_-32px_rgba(212,78,33,0.5)] ring-1 ring-ember-on-light/30"
                : "border-light-border bg-light-bg"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold tracking-cantila-tight text-light-ink">
                {tier.name}
              </h3>
              {featured && (
                <span className="rounded-md bg-ember-on-light/10 px-2 py-0.5 font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
                  Most picked
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-light-ink-dim">{tier.best}</p>
            <p className="mt-5 flex items-baseline gap-1.5 font-mono">
              <span className="font-display text-3xl font-semibold text-light-ink">
                {tier.price}
              </span>
              {tier.priceCadence && (
                <span className="text-sm text-light-ink-faint">
                  {tier.priceCadence}
                </span>
              )}
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-light-ink-dim">
              {tier.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-ember-on-light"
                    strokeWidth={2.4}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href={tier.cta.href}
              className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold ${
                featured
                  ? "bg-ember-on-light text-white hover:bg-[#e85f2a]"
                  : "border border-light-border bg-light-bg text-light-ink hover:border-light-ink-faint"
              }`}
            >
              {tier.cta.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
