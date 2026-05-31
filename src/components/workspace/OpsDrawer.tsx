"use client";

import { useEffect, useState } from "react";
import {
  Rocket,
  KeyRound,
  Globe,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ApiProjectDetail } from "../../lib/api";
import { cx } from "../ui";
import ProjectDeploysPanel from "../ProjectDeploysPanel";
import ProjectEnvPanel from "../ProjectEnvPanel";
import ProjectDomainsPanel from "../ProjectDomainsPanel";
import ProjectBrainPanel from "../ProjectBrainPanel";

/* ============================================================
   OpsDrawer — a slide-over bottom sheet that overlays the lower
   part of the browser preview (it does NOT shrink the iframe).
   Hosts the operational panels (Deploys / Env / Domains / Brain),
   reusing the existing components. Opens on Deploys by default;
   the chevron collapses it to a thin bar so the preview is full
   height. Open/collapsed + active tab persist.
   ============================================================ */

type Tab = "deploys" | "env" | "domains" | "brain";
const TABS: { key: Tab; label: string; icon: typeof Rocket }[] = [
  { key: "deploys", label: "Deploys", icon: Rocket },
  { key: "env", label: "Env", icon: KeyRound },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "brain", label: "Brain", icon: Brain },
];
const KEY = "cantila:preview-drawer";

export default function OpsDrawer({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const projectId = detail.project.id;
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("deploys");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as { open?: boolean; tab?: Tab };
        if (typeof s.open === "boolean") setOpen(s.open);
        if (s.tab) setTab(s.tab);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ open, tab }));
    } catch {
      /* ignore */
    }
  }, [open, tab]);

  const selectTab = (t: Tab) => {
    setTab(t);
    setOpen(true);
  };

  return (
    <div
      className={cx(
        "absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-xl border-t border-border bg-surface shadow-lift transition-[height] duration-200",
        open ? "h-[45%]" : "h-9",
      )}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-1.5 py-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => selectTab(key)}
            className={cx(
              "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-2xs font-medium",
              open && tab === key
                ? "bg-bg text-ink shadow-sm"
                : "text-ink-dim hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <button
          onClick={() => setOpen((o) => !o)}
          title={open ? "Collapse" : "Expand"}
          className="ml-auto rounded p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "deploys" && <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />}
          {tab === "env" && <ProjectEnvPanel projectId={projectId} />}
          {tab === "domains" && <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />}
          {tab === "brain" && <ProjectBrainPanel projectId={projectId} />}
        </div>
      )}
    </div>
  );
}
