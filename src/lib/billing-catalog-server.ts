/* ============================================================
   Server-side loader for the public marketing pricing catalog.

   The apex /pricing page renders both the plan-tier grid and the
   TLD pricebook from `GET /v1/billing/info` on the control plane —
   the same source the registrar quotes against, so the public
   numbers can never drift from `TLD_CATALOG` / §8.2.

   Fallback path: when the control plane is unreachable (offline
   dev, standalone Coolify build before the API is up), we fall
   back to the vendored copies under src/data/. Those still ship
   so a fresh clone renders /pricing without an API.

   Server-only — never bundle into a client component.
   ============================================================ */

import { TLD_PRICES } from "@/data/tld-prices";
import { PLAN_TIERS } from "@/data/plan-tiers";
import type { ApiBillingInfo, ApiPublicPlanTier, ApiPublicTldPrice } from "@/lib/api";

const TARGET = process.env.CANTILA_CONTROL_PLANE_URL ?? "http://localhost:8080";

export interface PublicBillingCatalog {
  tldPrices: ApiPublicTldPrice[];
  planTiers: ApiPublicPlanTier[];
  /** `"control-plane"` when the fetch landed, `"fallback"` when we
   *  served the vendored copy. Exposed for telemetry / E2E checks. */
  source: "control-plane" | "fallback";
}

const FALLBACK: PublicBillingCatalog = {
  tldPrices: TLD_PRICES,
  planTiers: PLAN_TIERS,
  source: "fallback",
};

/** Fetch the public marketing pricebook. Cached for 5 minutes so
 *  price edits show up without a redeploy but each request doesn't
 *  hammer the control plane. */
export async function loadPublicBillingCatalog(): Promise<PublicBillingCatalog> {
  const target = `${TARGET.replace(/\/$/, "")}/v1/billing/info`;
  try {
    const res = await fetch(target, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return FALLBACK;
    const body = (await res.json()) as ApiBillingInfo;
    const tldPrices = body.tldPrices ?? null;
    const planTiers = body.planTiers ?? null;
    if (!tldPrices || !planTiers) return FALLBACK;
    return { tldPrices, planTiers, source: "control-plane" };
  } catch {
    return FALLBACK;
  }
}
