"use client";

import { useState } from "react";
import { Rocket, KeyRound, Globe, Brain } from "lucide-react";
import type { ApiProjectDetail } from "../../lib/api";
import { cx } from "../ui";
import LivePreview from "./LivePreview";
import ProjectDeploysPanel from "../ProjectDeploysPanel";
import ProjectEnvPanel from "../ProjectEnvPanel";
import ProjectDomainsPanel from "../ProjectDomainsPanel";
import ProjectBrainPanel from "../ProjectBrainPanel";

type Tab = "deploys" | "env" | "domains" | "brain";
const TABS: { key: Tab; label: string; icon: typeof Rocket }[] = [
  { key: "deploys", label: "Deploys", icon: Rocket },
  { key: "env", label: "Env", icon: KeyRound },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "brain", label: "Brain", icon: Brain },
];

export default function PreviewColumn({
  detail,
  liveUrl,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  liveUrl: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("deploys");
  const projectId = detail.project.id;
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        <LivePreview url={liveUrl} />
      </div>
      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-2xs font-medium",
              tab === key ? "bg-bg text-ink shadow-sm" : "text-ink-dim hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {tab === "deploys" && <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />}
        {tab === "env" && <ProjectEnvPanel projectId={projectId} />}
        {tab === "domains" && <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />}
        {tab === "brain" && <ProjectBrainPanel projectId={projectId} />}
      </div>
    </div>
  );
}
