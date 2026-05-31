"use client";

/* ============================================================
   agentMeta — resolve a fleet agent key to a stable identity.

   Every chat message and op-card is attributed to a fleet
   agent. This module gives each agent key a `{ label, role,
   color }`:

   - Known fleet roles are seeded in a static map with hand-
     picked colors.
   - Unknown keys get a deterministic color from a hash of the
     key, so the same agent always paints the same hue.
   - Optionally enriched once from `getAgentOrg` (the live org
     chart), cached in a module-level promise so we hit the
     endpoint at most once per session. Enrichment never blocks
     rendering — the static/hashed fallback is always available.
   ============================================================ */

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export interface AgentMeta {
  /** Display label, e.g. "Orchestrator". */
  label: string;
  /** Short role descriptor, e.g. "Planning". */
  role: string;
  /** A hex color for the badge/avatar. */
  color: string;
}

/* A small palette of theme-friendly hues for hashed unknowns. */
const HASH_PALETTE = [
  "#ff6a3d", // ember
  "#3da9ff", // info blue
  "#34d399", // live green
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fbbf24", // amber
  "#22d3ee", // cyan
  "#fb7185", // rose
  "#a3e635", // lime
  "#c084fc", // purple
];

/* Known fleet roles → identity. Keys are matched case-insensitively
   and also against a few common aliases (see `normalizeKey`). */
const STATIC_META: Record<string, AgentMeta> = {
  orchestrator: { label: "Orchestrator", role: "Planning", color: "#ff6a3d" },
  planner: { label: "Planner", role: "Planning", color: "#ff8a5d" },
  builder: { label: "Builder", role: "Scaffold", color: "#3da9ff" },
  scaffold: { label: "Scaffold", role: "Scaffold", color: "#3da9ff" },
  image: { label: "Image", role: "Media", color: "#a78bfa" },
  media: { label: "Media", role: "Media", color: "#a78bfa" },
  seo: { label: "SEO", role: "Growth", color: "#34d399" },
  deploy: { label: "Deploy", role: "Delivery", color: "#22d3ee" },
  scale: { label: "Scale", role: "Delivery", color: "#22d3ee" },
  security: { label: "Security", role: "Trust", color: "#fb7185" },
  domains: { label: "Domains", role: "Network", color: "#fbbf24" },
  domain: { label: "Domains", role: "Network", color: "#fbbf24" },
  env: { label: "Env", role: "Config", color: "#c084fc" },
  database: { label: "Database", role: "Data", color: "#f472b6" },
  db: { label: "Database", role: "Data", color: "#f472b6" },
  copy: { label: "Copy", role: "Content", color: "#a3e635" },
  content: { label: "Content", role: "Content", color: "#a3e635" },
};

/** A few aliases that map onto a canonical key in STATIC_META. */
const ALIASES: Record<string, string> = {
  orchestration: "orchestrator",
  build: "builder",
  scaffolder: "scaffold",
  images: "image",
  pictures: "image",
  art: "image",
  deployment: "deploy",
  deployer: "deploy",
  sec: "security",
  dns: "domains",
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/* djb2-ish string hash → stable non-negative int. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function titleize(key: string): string {
  const cleaned = key.trim().replace(/[_-]+/g, " ");
  if (!cleaned) return "Agent";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* Runtime overrides discovered from getAgentOrg (label only — we keep
   our curated colors when we already know the role). */
let enrichment: Record<string, Partial<AgentMeta>> = {};

/** Resolve an agent key to its identity. Pure + synchronous; uses the
 *  static map first, then any enrichment, then a hashed fallback. */
export function agentMeta(rawKey: string | undefined | null): AgentMeta {
  const key = (rawKey ?? "").trim();
  if (!key) {
    return { label: "Cantila", role: "Fleet", color: "#ff6a3d" };
  }
  const norm = normalizeKey(key);
  const canonical = ALIASES[norm] ?? norm;
  const base = STATIC_META[canonical];
  const enriched = enrichment[norm] ?? enrichment[canonical];

  if (base) {
    return { ...base, ...enriched } as AgentMeta;
  }
  // Unknown agent → deterministic hashed color + titleized label.
  const color = HASH_PALETTE[hashString(norm) % HASH_PALETTE.length];
  return {
    label: enriched?.label ?? titleize(key),
    role: enriched?.role ?? "Agent",
    color: enriched?.color ?? color,
  };
}

/** The initial(s) for an avatar — first letter, or first two for
 *  multi-word labels. */
export function agentInitials(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

/* ---- one-time org enrichment (module-level cached promise) ---- */

let orgPromise: Promise<void> | null = null;

/** Kick (or reuse) a one-time enrichment of agent identities from the
 *  live org chart. Failures are swallowed — the static map + hashed
 *  colors are always sufficient. Resolves once enrichment is applied. */
export function ensureAgentOrg(): Promise<void> {
  if (orgPromise) return orgPromise;
  orgPromise = (async () => {
    try {
      const org = await api.getAgentOrg();
      const next: Record<string, Partial<AgentMeta>> = {};
      for (const div of org.divisions ?? []) {
        for (const agent of div.agents ?? []) {
          const norm = normalizeKey(agent.id || agent.name);
          if (!norm) continue;
          next[norm] = {
            label: agent.name || titleize(agent.id),
            role: div.label || "Agent",
          };
        }
      }
      enrichment = next;
    } catch {
      // org unavailable — keep static fallback.
    }
  })();
  return orgPromise;
}

/** Hook: resolves an agent key to its meta, re-rendering once the org
 *  enrichment lands. Safe to call with an undefined key. */
export function useAgentMeta(key: string | undefined | null): AgentMeta {
  const [, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    void ensureAgentOrg().then(() => {
      if (alive) setTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);
  return agentMeta(key);
}
