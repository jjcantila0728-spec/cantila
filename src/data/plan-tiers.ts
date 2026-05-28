/* ============================================================
   Marketing-side plan catalog. Mirrors the illustrative table
   in Cantila_Complete_Plan.md §8.2 — the Console's billing
   surface reads its own catalog from /v1/billing/info, so this
   list is only for the public pricing page. Keep the numbers
   in lock-step with §8.2 when the plan version changes.
   ============================================================ */

export type PlanTier = {
  slug: "hobby" | "starter" | "pro" | "agency" | "dedicated";
  name: string;
  price: string;
  priceCadence?: string;
  best: string;
  bullets: string[];
  cta: { label: string; href: string };
  featured?: boolean;
};

export const PLAN_TIERS: PlanTier[] = [
  {
    slug: "hobby",
    name: "Hobby",
    price: "$0",
    priceCadence: "/ mo",
    best: "Trying Cantila and side projects.",
    bullets: [
      "1 small app on a *.cantila.app subdomain",
      "Sleeps when idle",
      "Auto-wired Postgres, ready in the env",
      "Community support",
    ],
    cta: { label: "Start free", href: "/signup" },
  },
  {
    slug: "starter",
    name: "Starter",
    price: "~$10",
    priceCadence: "/ mo",
    best: "Indie hackers shipping a real product.",
    bullets: [
      "A few always-on apps",
      "1 custom domain included",
      "1 managed database",
      "Email + SMS quotas, metered overage",
      "Build minutes + 50 GB transfer",
    ],
    cta: { label: "Start on Starter", href: "/signup?plan=starter" },
    featured: true,
  },
  {
    slug: "pro",
    name: "Pro",
    price: "~$35",
    priceCadence: "/ mo",
    best: "Serious solo builders and small teams.",
    bullets: [
      "More apps and more resources per app",
      "Auto-scaling and preview environments",
      "Multiple databases, branching, point-in-time restore",
      "Priority support",
    ],
    cta: { label: "Start on Pro", href: "/signup?plan=pro" },
  },
  {
    slug: "agency",
    name: "Agency",
    price: "~$99+",
    priceCadence: "/ mo",
    best: "Agencies and resellers.",
    bullets: [
      "White-label sub-accounts",
      "Team seats and role-based access",
      "Wholesale add-on pricing",
      "Per-account branding and billing rollup",
    ],
    cta: { label: "Talk to sales", href: "/contact?topic=agency" },
  },
  {
    slug: "dedicated",
    name: "Dedicated",
    price: "Custom",
    best: "Workloads needing isolation or an SLA.",
    bullets: [
      "Dedicated VPS nodes",
      "SSO and audit log export",
      "Uptime SLA",
      "Hands-on support",
    ],
    cta: { label: "Contact us", href: "/contact?topic=dedicated" },
  },
];
