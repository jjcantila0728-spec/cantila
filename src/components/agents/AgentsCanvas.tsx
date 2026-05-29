"use client";

/* ============================================================
   AgentsCanvas — hub-and-spoke flow visualisation.
   Brain at the center, every agent (and every proposed agent
   from the admin chat) as a satellite linked back to it. The
   canvas is read-only by default: the layout is computed from
   AGENT_ORDER + the proposed-agent list, not editable through
   React Flow handles.
   ============================================================ */

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import type { ApiAgentName, ApiAgentsSnapshot } from "@/lib/api";
import {
  AGENT_BLURB,
  AGENT_GLYPH,
  AGENT_ORDER,
  AGENT_TONE,
  type ProposedAgentRow,
} from "./agent-meta";
import AgentNode, { type AgentNodeData } from "./AgentNode";
import BrainNode, { type BrainNodeData } from "./BrainNode";

const NODE_TYPES = { brain: BrainNode, agent: AgentNode } as const;

const CX = 360;
const CY = 280;
const R = 220;

function radial(i: number, n: number): { x: number; y: number } {
  const theta = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + R * Math.cos(theta), y: CY + R * Math.sin(theta) };
}

function tickLabel(snap: ApiAgentsSnapshot | null): string {
  if (!snap) return "loading…";
  const at = new Date(snap.at);
  return `last tick · ${at.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export interface AgentsCanvasProps {
  snapshot: ApiAgentsSnapshot | null;
  proposed: ProposedAgentRow[];
  /** Owner-only: drag agents around to rearrange the satellites. */
  draggable?: boolean;
}

export default function AgentsCanvas(props: AgentsCanvasProps) {
  return (
    <ReactFlowProvider>
      <AgentsCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function AgentsCanvasInner({
  snapshot,
  proposed,
  draggable = false,
}: AgentsCanvasProps) {
  const { nodes, edges } = useMemo(() => {
    const activeAgents = AGENT_ORDER;
    const total = activeAgents.length + proposed.length;

    const brain: Node<BrainNodeData> = {
      id: "brain",
      type: "brain",
      position: { x: CX - 56, y: CY - 56 },
      data: {
        paused: snapshot?.paused ?? false,
        tickLabel: tickLabel(snapshot),
      },
      draggable: false,
      selectable: false,
    };

    const agentNodes: Node<AgentNodeData>[] = activeAgents.map((name, i) => {
      const { x, y } = radial(i, total);
      const stat = snapshot?.agentStats[name as ApiAgentName] ?? {
        observations: 0,
        actions: 0,
      };
      return {
        id: `agent:${name}`,
        type: "agent",
        position: { x: x - 80, y: y - 36 },
        data: {
          kind: "active" as const,
          name,
          glyph: AGENT_GLYPH[name as ApiAgentName],
          blurb: AGENT_BLURB[name as ApiAgentName],
          tone: AGENT_TONE[name as ApiAgentName],
          observations: stat.observations,
          actions: stat.actions,
        },
        draggable,
        selectable: false,
      };
    });

    const proposedNodes: Node<AgentNodeData>[] = proposed.map((p, i) => {
      const offset = activeAgents.length + i;
      const { x, y } = radial(offset, total);
      const glyph =
        p.name
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 2)
          .toUpperCase() || "??";
      return {
        id: `proposed:${p.id}`,
        type: "agent",
        position: { x: x - 80, y: y - 36 },
        data: {
          kind: "proposed" as const,
          name: p.name,
          glyph,
          blurb: p.blurb,
          tone: "text-ink-dim bg-surface-3 ring-border",
        },
        draggable,
        selectable: false,
      };
    });

    const allAgentNodes = [...agentNodes, ...proposedNodes];

    const edges: Edge[] = allAgentNodes.map((n) => ({
      id: `e:${n.id}`,
      source: "brain",
      target: n.id,
      animated: false,
      style: {
        stroke: "currentColor",
        strokeWidth: 1,
        opacity: n.data.kind === "proposed" ? 0.35 : 0.5,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      className: "text-ink-faint",
    }));

    return { nodes: [brain, ...allAgentNodes], edges };
  }, [snapshot, proposed, draggable]);

  return (
    <div className="panel relative h-[520px] overflow-hidden p-0">
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-24" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        edgesFocusable={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        minZoom={0.5}
        maxZoom={1.4}
      >
        <Background gap={20} size={1} color="currentColor" className="text-ink-faint/30" />
        <Controls
          showInteractive={false}
          className="!bg-surface-2 !border !border-border [&>button]:!bg-surface-2 [&>button]:!border-border [&>button]:!text-ink-dim"
        />
      </ReactFlow>
    </div>
  );
}
