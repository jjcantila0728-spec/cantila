"use client";

/* ============================================================
   FleetStrip — compact strip of agents active during a run.

   Derived from running ops + recent agent messages. Hidden when
   idle (no running ops and not streaming). A subtle pulse marks
   it as live.
   ============================================================ */

import { useAgentMeta } from "./agentMeta";
import { AgentAvatar } from "./AgentBadge";
import type { ChatMsg } from "../ProjectChatMessages";

/** Collect the distinct, currently-active agent keys, most-recent first. */
export function activeAgents(messages: ChatMsg[], limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  // Running ops first (these are unambiguously active right now).
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind === "op" && m.op.status === "running" && m.op.agent) {
      if (!seen.has(m.op.agent)) {
        seen.add(m.op.agent);
        out.push(m.op.agent);
      }
    }
  }
  // Then the most recent agent speakers, to fill the strip.
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const m = messages[i];
    if (m.kind === "agent" && m.agent && !seen.has(m.agent)) {
      seen.add(m.agent);
      out.push(m.agent);
    }
  }
  return out.slice(0, limit);
}

function FleetMember({ agentKey }: { agentKey: string }) {
  const meta = useAgentMeta(agentKey);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg py-0.5 pl-0.5 pr-2">
      <AgentAvatar agentKey={agentKey} size="sm" pulse />
      <span className="text-2xs font-medium" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </span>
  );
}

export function FleetStrip({
  messages,
  running,
}: {
  messages: ChatMsg[];
  running?: boolean;
}) {
  const agents = activeAgents(messages);
  if (!running || agents.length === 0) return null;
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-surface/90 px-5 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-faint">
          Fleet active
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {agents.map((a) => (
            <FleetMember key={a} agentKey={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
