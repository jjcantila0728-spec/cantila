/* ============================================================
   Shared agent vocabulary — tones, blurbs, glyphs, ordering.
   Both AgentsView (status sections) and AgentsCanvas
   (hub-and-spoke node layout) read from here so the visual
   language stays in sync.
   ============================================================ */

import type { ApiAgentName, ApiAgentProposalRow } from "@/lib/api";

/** Re-exported alias so canvas/chat consumers don't need to import
 *  from two places for the same shape. */
export type ProposedAgentRow = ApiAgentProposalRow;

export const AGENT_TONE: Record<ApiAgentName, string> = {
  uptime: "text-live bg-live/10 ring-live/20",
  deploy: "text-ember bg-ember/10 ring-ember/20",
  cost: "text-info bg-info/10 ring-info/20",
  scale: "text-violet bg-violet/10 ring-violet/20",
  security: "text-warn bg-warn/10 ring-warn/20",
  capacity: "text-ink-dim bg-ink-dim/10 ring-ink-dim/20",
  mail: "text-down bg-down/10 ring-down/20",
  sms: "text-ember-bright bg-ember-bright/10 ring-ember-bright/20",
  automation: "text-violet bg-violet/10 ring-violet/20",
};

export const AGENT_BLURB: Record<ApiAgentName, string> = {
  uptime: "Auto-rollback on crash",
  deploy: "Surface failed deploys",
  cost: "Right-size & idle scan",
  scale: "Keep instance count in bounds",
  security: "Auth bursts & stale keys",
  capacity: "Node load & pre-warm",
  mail: "Bounce & complaint rates",
  sms: "Failure & opt-out rates",
  automation: "Workflow failures & engine reach",
};

export const AGENT_GLYPH: Record<ApiAgentName, string> = {
  uptime: "UP",
  deploy: "DP",
  cost: "$$",
  scale: "SC",
  security: "SY",
  capacity: "CP",
  mail: "MA",
  sms: "SM",
  automation: "AU",
};

/** Canonical ordering for layout — keeps the canvas stable across renders
 *  even when the snapshot's `agentStats` Object key order shifts. */
export const AGENT_ORDER: ApiAgentName[] = [
  "uptime",
  "deploy",
  "scale",
  "capacity",
  "security",
  "cost",
  "automation",
  "mail",
  "sms",
];

/* ---------- suggested agents (Phase B) ---------- */

export interface SuggestedAgent {
  id: string;
  name: string;
  glyph: string;
  blurb: string;
}

export const SUGGESTED_AGENTS: SuggestedAgent[] = [
  {
    id: "databases",
    name: "Databases",
    glyph: "DB",
    blurb: "Connection pool, slow queries, backup verification",
  },
  {
    id: "domains",
    name: "Domains",
    glyph: "DN",
    blurb: "DNS drift, AAAA mismatches, propagation health",
  },
  {
    id: "billing",
    name: "Billing",
    glyph: "BI",
    blurb: "Failed charges, dunning, Cantilapay MoR thresholds",
  },
  {
    id: "certs",
    name: "Certs/TLS",
    glyph: "CR",
    blurb: "TLS expiry across all attached domains",
  },
  {
    id: "logs",
    name: "Logs",
    glyph: "LG",
    blurb: "Anomaly detection on stdout/stderr (error spikes)",
  },
  {
    id: "seo",
    name: "SEO",
    glyph: "SE",
    blurb: "Already shipped in control-plane — surface it here",
  },
];
