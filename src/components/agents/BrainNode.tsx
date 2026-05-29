"use client";

/* ============================================================
   BrainNode — the hub at the center of the agents canvas.
   Shows paused/running state and the absolute timestamp of the
   last tick. Carries no React Flow handles because edges are
   wired by the canvas as floating edges (sourceless/targetless
   on the brain side suffices visually).
   ============================================================ */

import { Brain, Pause, Zap } from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cx } from "@/components/ui";

export interface BrainNodeData {
  paused: boolean;
  tickLabel: string;
}

export default function BrainNode({ data }: NodeProps<BrainNodeData>) {
  return (
    <div className="relative">
      {/* invisible target handle so edges from agents have a snap point */}
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
          "flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full border bg-bg shadow-[0_0_40px_-8px_rgba(255,106,61,0.4)] ring-2 ring-offset-2 ring-offset-bg",
          data.paused
            ? "border-down/40 ring-down/30"
            : "border-ember/50 ring-ember/40",
        )}
      >
        <Brain
          className={cx(
            "h-7 w-7",
            data.paused ? "text-down" : "text-ember",
          )}
          strokeWidth={1.6}
        />
        <div className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-ink-dim">
          brain
        </div>
        <div
          className={cx(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-mono uppercase tracking-wider",
            data.paused
              ? "bg-down/10 text-down"
              : "bg-live/10 text-live",
          )}
        >
          {data.paused ? (
            <Pause className="h-2 w-2" strokeWidth={2.6} />
          ) : (
            <Zap className="h-2 w-2" strokeWidth={2.6} />
          )}
          {data.paused ? "paused" : "live"}
        </div>
      </div>
      <div className="mt-1 text-center font-mono text-[0.55rem] text-ink-faint">
        {data.tickLabel}
      </div>
    </div>
  );
}
