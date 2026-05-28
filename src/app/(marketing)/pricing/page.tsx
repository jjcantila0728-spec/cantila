/* ============================================================
   /pricing — full breakdown.

   Plan tiers and TLD pricebook are loaded server-side from the
   control plane at /v1/billing/info (single source of truth —
   same shape the Console's /billing page reads). When the API
   is unreachable we fall back to the vendored copies under
   src/data/, so a standalone clone still renders /pricing.
   Revalidated every 5 minutes; price edits propagate without
   a redeploy.
   ============================================================ */

import HeroDarkBand from "@/components/marketing/HeroDarkBand";
import PricingTable from "@/components/marketing/PricingTable";
import DomainPriceTable from "@/components/marketing/DomainPriceTable";
import {
  CtaBand,
  PrimaryCta,
  SecondaryCta,
  Section,
} from "@/components/marketing/ui";
import JsonLd from "@/components/JsonLd";
import { buildPageMetadata, faqJsonLd } from "@/lib/seo";
import { loadPublicBillingCatalog } from "@/lib/billing-catalog-server";

export const metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Start free. Pay for what you ship. Plan tiers, metered overages, and the cheapest-in-market domain catalog.",
  path: "/pricing",
});

export const revalidate = 300;

const OVERAGES = [
  { meter: "CPU-vCore-hour", price: "$0.012", note: "Above plan allowance" },
  { meter: "RAM GB-hour", price: "$0.006", note: "Always-on apps" },
  { meter: "Bandwidth (GB)", price: "$0.04", note: "Egress only — ingress is free" },
  { meter: "Object storage (GB-mo)", price: "$0.018", note: "S3-compatible, optional CDN" },
  { meter: "Postgres / Mongo (GB-mo)", price: "$0.18", note: "Managed, daily backups" },
  { meter: "Email (per 1k)", price: "$0.30", note: "Outbound, Phase 2" },
  { meter: "SMS (per message)", price: "$0.0075", note: "US local — varies by destination, Phase 3" },
];

const FAQ = [
  {
    q: "Is the free Hobby plan actually free?",
    a: "Yes. One small app on a *.cantila.app subdomain, sleeps when idle, comes with an auto-wired Postgres ready in the env. No card required — you only enter billing when you want a custom domain, always-on, or a paid add-on.",
  },
  {
    q: "Why is your domain pricing so much lower than retail?",
    a: "Domains are top-of-funnel — the registrar is where new customers meet Cantila. We resell at near-wholesale on the catalog above (the same play Cloudflare Registrar uses) and earn margin on the hosting, email, SMS and database that get bundled with each domain. WHOIS privacy is free and auto-renew is on by default.",
  },
  {
    q: "What counts as metered overage?",
    a: "Everything in the table above. Each plan ships an allowance; once the allowance is used we meter the excess in 1-second / 1-byte units. Spend caps and budget alerts are on by default — you set the ceiling, we never silently push past it.",
  },
  {
    q: "What happens to my apps if a payment fails?",
    a: "Stripe drives dunning. Your account moves active → past_due → suspended → canceled with email at each step. Suspension stops new deploys and sleeps your always-on apps; everything restores the moment you fix the card.",
  },
  {
    q: "When are Cantila Mail and SMS priced as 'live'?",
    a: "Mail's sending and receiving infrastructure ships in Phase 2; SMS in Phase 3. Until each lands, the meter for that line item runs through Cantila's stub adapter and is not charged. The plan's $/k email and $/SMS take effect the week the live carrier path goes live.",
  },
  {
    q: "Can I bring my own VPS?",
    a: "Yes — Pro and above. Cantila installs a small agent on your node, brings it into the fleet, and runs your projects on it. Useful when you need a specific region, a specific provider, or higher per-app density without paying for our compute.",
  },
];

export default async function PricingPage() {
  const catalog = await loadPublicBillingCatalog();
  return (
    <>
      <JsonLd payload={faqJsonLd(FAQ.map(({ q, a }) => ({ q, a })))} />
      <HeroDarkBand
        eyebrow="Pricing"
        title={
          <>
            Start free. Pay for what you{" "}
            <span className="text-ember">ship.</span>
          </>
        }
        description="Hobby is genuinely useful — a small app, an auto-wired Postgres, no card. Real custom domains and always-on apps start at $10. Bigger workloads scale up; everything stays on one invoice."
        actions={
          <>
            <PrimaryCta href="/signup">Start free</PrimaryCta>
            <SecondaryCta href="#tiers" tone="dark">
              See tiers
            </SecondaryCta>
          </>
        }
        tone="compact"
      />

      <Section id="tiers" eyebrow="Plan tiers" title="Pick the shape that matches what you're shipping.">
        <PricingTable tiers={catalog.planTiers} />
        <p className="mt-5 text-sm text-light-ink-faint">
          Prices in USD. Tier numbers are illustrative against measured infra
          cost (plan §8.2); the exact figure on your invoice is whatever
          Stripe says it is.
        </p>
      </Section>

      <Section
        eyebrow="Domains"
        title="Cheapest in market on every TLD that matters."
        description="The Cantila Domains catalog is priced near wholesale because the domain is the hook for the bundled services. WHOIS privacy and auto-renew are included free."
        bg="paper"
      >
        <DomainPriceTable prices={catalog.tldPrices} />
      </Section>

      <Section
        eyebrow="Metered overage"
        title="Above the plan allowance, you pay the meter."
        description="Spend caps and budget alerts on by default. You set the ceiling; Cantila never quietly pushes past it."
      >
        <div className="overflow-x-auto rounded-2xl border border-light-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-light-surface text-left font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
                <th className="px-4 py-3">Meter</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {OVERAGES.map((row, i) => (
                <tr
                  key={row.meter}
                  className={i % 2 === 0 ? "bg-light-bg" : "bg-light-surface/40"}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-light-ink">{row.meter}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-ember-on-light">
                    {row.price}
                  </td>
                  <td className="px-4 py-3 text-light-ink-dim">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="Questions"
        title="Things worth answering up front."
        bg="paper"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {FAQ.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border border-light-border bg-light-bg p-6"
            >
              <h3 className="font-display text-lg font-semibold tracking-cantila-tight text-light-ink">
                {f.q}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-light-ink-dim">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Ready to ship?"
        description="Hobby is free. Everything else metered fairly. No annual lock-in."
        primary={{ href: "/signup", label: "Start free" }}
        secondary={{ href: "/contact?topic=pricing", label: "Talk to JJ" }}
      />
    </>
  );
}
