"use client";

/* ============================================================
   AgentNode — a single agent satellite on the canvas.
   Three visual states:
     - active    : real agent with live obs/act counts
     - proposed  : admin-queued, no backend wiring yet (dimmed,
                   dashed border, "proposed" pill)
     - suggested : sits in the SuggestionRail, hover-to-promote
   ============================================================ */

import { Handle, Position, type NodeProps } from "reactflow";
import { cx } from "@/components/ui";

export type AgentNodeKind = "active" | "proposed" | "suggested";

export interface AgentNodeData {
  kind: AgentNodeKind;
  name: string;
  glyph: string;
  blurb: string;
  tone: string;
  /** present when kind === "active" */
  observations?: number;
  actions?: number;
}

export default function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const isProposed = data.kind === "proposed";

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
      <div
        className={cx(
          "w-40 rounded-xl border bg-bg/95 px-3 py-2.5 backdrop-blur transition-colors",
          isProposed
            ? "border-dashed border-ink-faint/60 opacity-70"
            : "border-border shadow-[0_4px_18px_-10px_rgba(0,0,0,0.4)] hover:border-ink-faint",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[0.6rem] font-semibold ring-1",
              data.tone,
            )}
          >
            {data.glyph}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.7rem] font-semibold text-ink">
              {data.name}
            </div>
            <div className="truncate font-mono text-[0.55rem] uppercase tracking-wider text-ink-faint">
              {isProposed ? "proposed" : "agent"}
            </div>
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[0.62rem] leading-tight text-ink-dim">
          {data.blurb}
        </p>
        {data.kind === "active" && (
          <div className="mt-1.5 flex items-center justify-between border-t border-border-soft pt-1.5 font-mono text-[0.55rem] text-ink-faint">
            <span>
              <span className="font-semibold text-ink">
                {data.observations ?? 0}
              </span>{" "}
              obs
            </span>
            <span>
              <span className="font-semibold text-ink">{data.actions ?? 0}</span>{" "}
              acted
            </span>
          </div>
        )}
        {isProposed && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-surface-3 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-ink-faint">
            backend pending
          </div>
        )}
      </div>
    </div>
  );
}
