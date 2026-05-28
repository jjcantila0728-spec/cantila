"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Rocket, Workflow } from "lucide-react";
import { PageHeader, cx } from "@/components/ui";
import { api, isControlPlaneLive } from "@/lib/api";
import type { AutomationKind } from "@/lib/types";

type Region = "fsn1" | "hel1" | "ash";

const REGIONS: { id: Region; label: string; loc: string }[] = [
  { id: "fsn1", label: "Falkenstein", loc: "Germany" },
  { id: "hel1", label: "Helsinki", loc: "Finland" },
  { id: "ash", label: "Ashburn", loc: "United States" },
];

const KIND_BLURB: Record<AutomationKind, string> = {
  n8n: "Workflow automation with 400+ integrations. Drag nodes, wire them up, run on a schedule or webhook.",
  openclaw: "Autonomous browsing agent runtime. Set a goal, give it tools, let it work.",
};

export default function NewAutomationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialKind = (params.get("kind") as AutomationKind | null) ?? "n8n";

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

  async function submit() {
    if (!name.trim()) {
      setError("name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (liveMode) {
        const { automation } = await api.createAutomation({
          kind,
          name: name.trim(),
          region,
        });
        router.push(`/automations/${automation.id}`);
      } else {
        // Mock-mode fallback: drop the user back on the list with a hash
        // marker so the page can show a "created" toast in a follow-up.
        router.push(`/automations#new=${encodeURIComponent(name.trim())}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Automations"
        title="New automation"
        lead="Cantila provisions a managed instance, auto-wires the database it needs, and drops you straight into the workflow builder."
      />

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* kind picker */}
      <section className="panel space-y-4 p-5">
        <header>
          <h2 className="font-display text-sm font-semibold text-ink">Engine</h2>
          <p className="text-2xs text-ink-faint">
            The vendor engine runs underneath. The Cantila builder is the same for either.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["n8n", "openclaw"] as AutomationKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cx(
                "panel flex flex-col items-start gap-2 p-4 text-left transition-all hover:border-ember/40",
                kind === k && "border-ember/50 ring-1 ring-ember/30",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember/10 font-display text-base font-bold text-ember">
                  {k === "n8n" ? "n" : "◎"}
                </span>
                <span className="font-display text-base font-semibold text-ink">
                  {k === "n8n" ? "n8n" : "OpenClaw"}
                </span>
              </div>
              <p className="text-2xs text-ink-dim">{KIND_BLURB[k]}</p>
            </button>
          ))}
        </div>
      </section>

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
            placeholder="ops-flows"
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ember focus:ring-1 focus:ring-ember/30"
            autoFocus
          />
        </label>

        <div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Region
          </span>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRegion(r.id)}
                className={cx(
                  "panel flex flex-col items-start gap-1 p-3 text-left transition-all hover:border-ember/40",
                  region === r.id && "border-ember/50 ring-1 ring-ember/30",
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
          onClick={() => router.back()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-ink-dim hover:bg-surface-3 hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" strokeWidth={2.4} />
          )}
          Create automation
        </button>
      </div>
    </div>
  );
}
