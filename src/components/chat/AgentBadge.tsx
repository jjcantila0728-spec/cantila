"use client";

/* ============================================================
   AgentBadge — colored initial-avatar + label for a fleet agent.
   Resolves identity from agentMeta (with live-org enrichment).
   Shared by ChatMessage, OpCard and FleetStrip.
   ============================================================ */

import { agentInitials, useAgentMeta } from "./agentMeta";
import { cx } from "../ui";

/** Just the colored initial-avatar (no label). */
export function AgentAvatar({
  agentKey,
  size = "md",
  pulse = false,
}: {
  agentKey?: string;
  size?: "sm" | "md";
  pulse?: boolean;
}) {
  const meta = useAgentMeta(agentKey);
  const dims = size === "sm" ? "h-5 w-5 text-[0.6rem]" : "h-7 w-7 text-2xs";
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center rounded-lg font-mono font-bold text-[#13110f]",
        dims,
        pulse && "animate-pulse",
      )}
      style={{ backgroundColor: meta.color }}
      title={`${meta.label} · ${meta.role}`}
    >
      {agentInitials(meta.label)}
    </span>
  );
}

/** Avatar + label, optionally + role. */
export function AgentBadge({
  agentKey,
  size = "md",
  showRole = false,
}: {
  agentKey?: string;
  size?: "sm" | "md";
  showRole?: boolean;
}) {
  const meta = useAgentMeta(agentKey);
  return (
    <span className="inline-flex items-center gap-1.5">
      <AgentAvatar agentKey={agentKey} size={size} />
      <span className="inline-flex flex-col leading-tight">
        <span className="text-2xs font-semibold text-ink">{meta.label}</span>
        {showRole && (
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-faint">
            {meta.role}
          </span>
        )}
      </span>
    </span>
  );
}

/** A compact label-only chip (used inside op-card headers). */
export function AgentChip({ agentKey }: { agentKey?: string }) {
  const meta = useAgentMeta(agentKey);
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-2xs"
      style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
