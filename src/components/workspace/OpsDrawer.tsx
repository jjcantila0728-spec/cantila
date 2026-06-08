"use client";

import { Rocket, KeyRound, Globe, Brain, X } from "lucide-react";
import type { ApiProjectDetail } from "../../lib/api";
import ProjectDeploysPanel from "../ProjectDeploysPanel";
import ProjectEnvPanel from "../ProjectEnvPanel";
import ProjectDomainsPanel from "../ProjectDomainsPanel";
import ProjectBrainPanel from "../ProjectBrainPanel";

/* ============================================================
   OpsDrawer — a slide-over bottom sheet that overlays the lower
   part of the browser preview (it does NOT shrink the iframe).
   Hosts one operational panel (Deploys / Env / Domains / Brain)
   at a time. The tab strip that selects the panel now lives in
   the workspace toolbar (inline with the project title); this
   component is a controlled surface that opens when a tab is
   picked and closes via the ✕ or by re-clicking the active tab.
   ============================================================ */

export type OpsTab = "deploys" | "env" | "domains" | "brain";

export const OPS_TABS: { key: OpsTab; label: string; icon: typeof Rocket }[] = [
  { key: "deploys", label: "Deploys", icon: Rocket },
  { key: "env", label: "Env", icon: KeyRound },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "brain", label: "Brain", icon: Brain },
];

export default function OpsDrawer({
  detail,
  onRefresh,
  tab,
  onClose,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
  tab: OpsTab | null;
  onClose: () => void;
}) {
  if (!tab) return null;
  const projectId = detail.project.id;
  const meta = OPS_TABS.find((t) => t.key === tab)!;
  const Icon = meta.icon;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-[60%] flex-col rounded-t-xl border-t border-border bg-surface shadow-lift">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <Icon className="h-3.5 w-3.5 text-ember" />
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink">
          {meta.label}
        </span>
        <button
          onClick={onClose}
          title="Close"
          aria-label="Close"
          className="ml-auto rounded p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "deploys" && <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />}
        {tab === "env" && <ProjectEnvPanel projectId={projectId} />}
        {tab === "domains" && <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />}
        {tab === "brain" && <ProjectBrainPanel projectId={projectId} />}
      </div>
    </div>
  );
}
