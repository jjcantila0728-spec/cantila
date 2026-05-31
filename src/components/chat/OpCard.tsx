"use client";

/* ============================================================
   OpCard — a single orchestration op-card.

   Extracted from ProjectChatMessages and enhanced with a fleet
   agent badge, a status icon (spinner / done / failed), a
   collapsible log, and the existing inline asset preview.
   ============================================================ */

import { useState } from "react";
import {
  Search,
  Cpu,
  Database,
  Package,
  Server,
  Globe,
  HeartPulse,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Film,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { cx } from "../ui";
import { AssetThumbnail, type ChatOp } from "../ProjectChatMessages";
import { AgentChip } from "./AgentBadge";

const OP_ICON: Record<string, typeof Search> = {
  detect: Search,
  plan: Cpu,
  provision: Database,
  build: Package,
  schedule: Server,
  route: Globe,
  verify: HeartPulse,
  scaffold: Package,
  deploy: Server,
  scale: Cpu,
};

function pickIcon(op: ChatOp): typeof Search {
  if (op.key.startsWith("image:") || op.asset?.mimeType.startsWith("image/")) return ImageIcon;
  if (op.key.startsWith("anim:") || op.asset?.mimeType.includes("json")) return Film;
  return OP_ICON[op.key] ?? Cpu;
}

export function OpCard({ op }: { op: ChatOp }) {
  const [logOpen, setLogOpen] = useState(false);
  const Icon = pickIcon(op);
  const done = op.status === "done";
  const failed = op.status === "failed";
  const hasLog = !!op.log && op.log.length > 0;

  return (
    <div className="ml-11 flex gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
      <span
        className={cx(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          failed
            ? "border-red-500/30 bg-red-500/10 text-red-400"
            : done
              ? "border-live/30 bg-live/10 text-live"
              : "border-ember/30 bg-ember/10 text-ember",
        )}
      >
        {failed ? (
          <AlertCircle className="h-4 w-4" />
        ) : done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{op.title}</span>
          {op.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-ember" />}
          {op.agent && <AgentChip agentKey={op.agent} />}
        </div>
        {op.detail && <p className="mt-0.5 font-mono text-2xs text-ink-dim">{op.detail}</p>}

        {hasLog && (
          <>
            <button
              type="button"
              onClick={() => setLogOpen((o) => !o)}
              className="mt-1.5 inline-flex items-center gap-1 font-mono text-2xs text-ink-faint hover:text-ink-dim"
            >
              <ChevronRight
                className={cx("h-3 w-3 transition-transform", logOpen && "rotate-90")}
              />
              {logOpen ? "Hide log" : `Show log (${op.log!.length})`}
            </button>
            {logOpen && (
              <div className="mt-1.5 space-y-0.5 rounded-lg border border-border-soft bg-[#0a0b0d] px-3 py-2 font-mono text-2xs text-ink-faint">
                {op.log!.map((l, i) => (
                  <div key={i} className="animate-fade-in">
                    {l}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {op.asset?.dataUrl && (
          <div className="mt-2.5 inline-block overflow-hidden rounded-lg border border-border bg-bg">
            <AssetThumbnail dataUrl={op.asset.dataUrl} mimeType={op.asset.mimeType} />
            <div className="border-t border-border px-2.5 py-1.5 font-mono text-2xs text-ink-faint">
              {op.asset.path}
              {op.asset.provider && (
                <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-2xs">
                  {op.asset.provider}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
