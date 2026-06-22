"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Rocket, Lock } from "lucide-react";
import { PageHeader, cx } from "@/components/ui";
import { api, isControlPlaneLive } from "@/lib/api";
import type { AutomationKind } from "@/lib/types";

type Region = "fsn1" | "hel1" | "ash";

const REGIONS: { id: Region; label: string; loc: string }[] = [
  { id: "fsn1", label: "Falkenstein", loc: "Germany" },
  { id: "hel1", label: "Helsinki", loc: "Finland" },
  { id: "ash", label: "Ashburn", loc: "United States" },
];

/* ------------------------------------------------------------------
   Per-engine creation copy. n8n and OpenClaw are different products,
   so they get genuinely different creation flows — distinct glyph,
   accent colour, terminology ("workspace" vs "agent") and helper
   copy — rather than one shared modal that blurs the two.
   ------------------------------------------------------------------ */
interface EngineConfig {
  label: string;
  glyph: string;
  accent: "ember" | "violet";
  noun: string; // "workspace" | "agent"
  title: string;
  lead: string;
  blurb: string;
  namePlaceholder: string;
  nameHint: string;
  cta: string;
}

const ENGINES: Record<AutomationKind, EngineConfig> = {
  n8n: {
    label: "n8n",
    glyph: "n",
    accent: "ember",
    noun: "workspace",
    title: "New n8n workspace",
    lead: "Cantila provisions a dedicated n8n instance, auto-wires the database it needs, and drops you straight into the workflow builder.",
    blurb:
      "Workflow automation with 400+ integrations. Drag nodes, wire them up, run on a schedule or webhook.",
    namePlaceholder: "ops-flows",
    nameHint: "A short name for this n8n workspace.",
    cta: "Create workspace",
  },
  openclaw: {
    label: "OpenClaw",
    glyph: "◎",
    accent: "violet",
    noun: "agent",
    title: "New OpenClaw agent",
    lead: "Cantila provisions a dedicated OpenClaw runtime and drops you into the agent console, ready to set a goal and turn it loose.",
    blurb:
      "Autonomous browsing-agent runtime. Set a goal, give it tools, let it work.",
    namePlaceholder: "research-bot",
    nameHint: "A short name for this OpenClaw agent.",
    cta: "Create agent",
  },
};

/* Full literal class strings per accent so Tailwind keeps them. */
const ACCENT = {
  ember: {
    chip: "bg-ember/10 text-ember",
    ring: "border-ember/50 ring-1 ring-ember/30",
    focus: "focus:border-ember focus:ring-1 focus:ring-ember/30",
    cta: "bg-ember text-[#1a0e08] hover:bg-ember-bright",
  },
  violet: {
    chip: "bg-violet/10 text-violet",
    ring: "border-violet/50 ring-1 ring-violet/30",
    focus: "focus:border-violet focus:ring-1 focus:ring-violet/30",
    cta: "bg-violet text-[#140a24] hover:bg-violet/85",
  },
} as const;

export default function NewAutomationPage() {
  const router = useRouter();
  const params = useSearchParams();
  // When the page is reached from /n8n or /openclaw the engine is LOCKED via
  // ?kind= — the picker is hidden and the whole flow is branded to that engine.
  // Reached from the generic /automations list, kind is unset and the user
  // picks one.
  const urlKind = params.get("kind");
  const locked = urlKind === "n8n" || urlKind === "openclaw";
  const initialKind = (urlKind as AutomationKind | null) ?? "n8n";

  const [kind, setKind] = useState<AutomationKind>(initialKind);
  const [name, setName] = useState("");
  const [region, setRegion] = useState<Region>("fsn1");
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isControlPlaneLive().then((ok) => {
      if (!cancelled) setLiveMode(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const engine = ENGINES[kind];
  const accent = ACCENT[engine.accent];

  async function submit() {
    if (!name.trim()) {
      setError("name is required");
      return;
    }
    if (liveMode === false) {
      // No control plane => we genuinely cannot provision. Be honest rather
      // than faking a created instance.
      setError(
        "Control plane is unreachable — can't provision a real instance right now. Try again shortly.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { automation } = await api.createAutomation({
        kind,
        name: name.trim(),
        region,
      });
      router.push(`/automations/${automation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={locked ? engine.label : "Automations"}
        title={locked ? engine.title : "New automation"}
        lead={
          locked
            ? engine.lead
            : "Cantila provisions a managed instance, auto-wires the database it needs, and drops you straight into the builder."
        }
      />

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Engine — a picker when generic, a locked banner when engine-scoped */}
      {locked ? (
        <section className="panel flex items-center gap-3 p-5">
          <span
            className={cx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold",
              accent.chip,
            )}
          >
            {engine.glyph}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-ink">
                {engine.label}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-medium text-ink-faint">
                <Lock className="h-3 w-3" /> engine
              </span>
            </div>
            <p className="mt-0.5 text-2xs text-ink-dim">{engine.blurb}</p>
          </div>
        </section>
      ) : (
        <section className="panel space-y-4 p-5">
          <header>
            <h2 className="font-display text-sm font-semibold text-ink">
              Engine
            </h2>
            <p className="text-2xs text-ink-faint">
              Pick the engine to run. n8n builds visual workflows; OpenClaw runs
              autonomous agents — each gets its own dedicated instance.
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ENGINES) as AutomationKind[]).map((k) => {
              const e = ENGINES[k];
              const a = ACCENT[e.accent];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cx(
                    "panel flex flex-col items-start gap-2 p-4 text-left transition-all hover:border-ember/40",
                    kind === k && a.ring,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "flex h-9 w-9 items-center justify-center rounded-lg font-display text-base font-bold",
                        a.chip,
                      )}
                    >
                      {e.glyph}
                    </span>
                    <span className="font-display text-base font-semibold text-ink">
                      {e.label}
                    </span>
                  </div>
                  <p className="text-2xs text-ink-dim">{e.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* name + region */}
      <section className="panel space-y-4 p-5">
        <header>
          <h2 className="font-display text-sm font-semibold text-ink">Details</h2>
        </header>
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={engine.namePlaceholder}
            className={cx(
              "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors",
              accent.focus,
            )}
            autoFocus
          />
          <span className="mt-1 block text-[0.65rem] text-ink-faint">
            {engine.nameHint}
          </span>
        </label>

        <div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Region
          </span>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegion(r.id)}
                className={cx(
                  "panel flex flex-col items-start gap-1 p-3 text-left transition-all hover:border-ember/40",
                  region === r.id && accent.ring,
                )}
              >
                <span className="font-display text-sm font-semibold text-ink">
                  {r.label}
                </span>
                <span className="text-2xs text-ink-faint">{r.loc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-ink-dim hover:bg-surface-3 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !name.trim()}
          className={cx(
            "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50",
            accent.cta,
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" strokeWidth={2.4} />
          )}
          {engine.cta}
        </button>
      </div>
    </div>
  );
}
