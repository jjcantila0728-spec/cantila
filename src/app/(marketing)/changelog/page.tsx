/* ============================================================
   /changelog — manually curated, keyed to plan §15.1 entries.
   When the canonical version header in Cantila_Complete_Plan.md
   bumps (v1.X), add a new entry at the top. The plan stays the
   source of truth — this page is the customer-facing window
   onto it.
   ============================================================ */

import HeroDarkBand from "@/components/marketing/HeroDarkBand";
import { Section } from "@/components/marketing/ui";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Changelog",
  description:
    "What shipped, when. Mirrors §15.1 of the Cantila Complete Plan.",
  path: "/changelog",
});

type Entry = {
  version: string;
  date: string;
  highlights: { title: string; body: string }[];
};

const ENTRIES: Entry[] = [
  {
    version: "v1.13",
    date: "2026-05-28",
    highlights: [
      {
        title: "cantila.app — public marketing, signup, docs, legal.",
        body: "The apex hosts a public landing, eight product pages, /pricing with the full TLD catalog and metered overage table, /mcp with copy-paste install snippets for every Claude host, and an MDX-powered /docs covering Getting Started through Billing. /signup wires to /v1/auth/register. Console moved to console.cantila.app behind host-based middleware; the session cookie is scoped to the parent domain so signing in on the marketing site keeps you signed in on the dashboard.",
      },
    ],
  },
  {
    version: "v1.12",
    date: "2026-05-28",
    highlights: [
      {
        title: "Control plane self-hosted on Cantila.",
        body: "api.cantila.app now runs on the production Hetzner CPX22 node, deployed by Coolify Nixpacks straight from main, against a real Postgres 17 with STORE=prisma. Cantila ships Cantila.",
      },
      {
        title: "AI v2 — ClaudeAiAnalyser.",
        body: "AiAnalyser port with a Claude live adapter (claude-sonnet-4-6, prompt-cached, tool-use) and per-account BYOC Anthropic key, AES-256-GCM under CANTILA_SECRET_KEY.",
      },
    ],
  },
  {
    version: "v1.11",
    date: "2026-05-21",
    highlights: [
      {
        title: "Real data plane behind env-gated swap-in.",
        body: "CoolifyDataPlane adapter for the seven-method DataPlane port — projects, deploys, logs, scaling, env, domains, sleep — all live against the Coolify API when COOLIFY_API_* is set; stubbed otherwise.",
      },
    ],
  },
  {
    version: "v1.10",
    date: "2026-05-13",
    highlights: [
      {
        title: "Automations + Connections — Phases A–E.",
        body: "n8n live adapter, OpenClaw live adapter, 15-provider catalog (10 API-key + 5 OAuth), React-Flow canvas, MCP tools, CLI commands.",
      },
    ],
  },
  {
    version: "v1.9",
    date: "2026-05-04",
    highlights: [
      {
        title: "Cantila SMS surface.",
        body: "Number marketplace, port-in / transfer, durable inbound/outbound history, OTP engine, A2P/10DLC registration, call routing — all behind the TelephonyProvider port. Carrier path queued for Phase 3.",
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <HeroDarkBand
        eyebrow="Changelog"
        title="What shipped, when."
        description="Cantila is built in public against a single canonical plan. When something lands, a row goes into §15.1 of Cantila_Complete_Plan.md and into this list."
        tone="compact"
      />

      <Section>
        <div className="space-y-14">
          {ENTRIES.map((entry) => (
            <article key={entry.version} className="grid gap-6 lg:grid-cols-[140px_1fr]">
              <div>
                <p className="font-display text-2xl font-semibold tracking-cantila-tight text-light-ink">
                  {entry.version}
                </p>
                <p className="mt-1 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
                  {entry.date}
                </p>
              </div>
              <div className="space-y-4 border-l border-light-border pl-6">
                {entry.highlights.map((h) => (
                  <div key={h.title}>
                    <h3 className="font-display text-lg font-semibold tracking-cantila-tight text-light-ink">
                      {h.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-light-ink-dim">
                      {h.body}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-14 text-sm text-light-ink-faint">
          For the full history,{" "}
          <a
            href="https://github.com/jjcantila0728-spec/cantila-control-plane/commits/main"
            className="text-ember-on-light hover:underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            read the commit log
          </a>
          .
        </p>
      </Section>
    </>
  );
}
