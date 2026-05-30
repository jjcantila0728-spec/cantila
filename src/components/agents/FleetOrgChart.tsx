"use client";
import { useEffect, useState } from "react";
import { api, isControlPlaneLive, type ApiAgentOrg, type ApiAgentSessionStatus } from "@/lib/api";
import { cx } from "@/components/ui";

const DOT: Record<ApiAgentSessionStatus, string> = {
  idle: "bg-ink-faint/40",
  working: "bg-ember animate-pulse",
  done: "bg-live",
  failed: "bg-down",
};

export default function FleetOrgChart() {
  const [org, setOrg] = useState<ApiAgentOrg | null>(null);
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLive(ok);
      if (!ok) return;
      const load = async () => { try { const o = await api.getAgentOrg(); if (!cancelled) setOrg(o); } catch {} };
      void load();
      timer = window.setInterval(load, 5000);
    })();
    return () => { cancelled = true; if (timer) window.clearInterval(timer); };
  }, []);

  if (live === false) return <div className="panel py-6 text-center text-2xs text-ink-faint">Control plane offline.</div>;
  if (!org) return <div className="panel py-6 text-center text-2xs text-ink-faint">Loading the fleet…</div>;

  return (
    <div className="space-y-4">
      <p className="text-2xs text-ink-faint">
        {org.divisions.reduce((n, d) => n + d.agents.length, 0)} agents · {org.divisions.length} divisions · {org.activeBuilds} active build{org.activeBuilds === 1 ? "" : "s"}
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {org.divisions.map((d) => (
          <div key={d.key} className="panel p-3">
            <h3 className="kv mb-2 text-ink-dim">{d.label}</h3>
            <ul className="space-y-1">
              {d.agents.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-2xs">
                  <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", DOT[a.status])} />
                  <span className="font-mono text-ink">{a.name}</span>
                  <span className="ml-auto rounded bg-surface-2 px-1 py-0.5 text-[0.55rem] uppercase tracking-wider text-ink-faint">{a.model}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
