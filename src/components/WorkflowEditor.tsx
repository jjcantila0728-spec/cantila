"use client";

/* ============================================================
   WorkflowEditor — plan §4.10 Phase B native canvas.

   React-Flow-driven workflow canvas mirroring the Cantila
   canonical `WorkflowGraph` shape. Layout:

       ┌──────────────────────────────────────────────────────┐
       │ Header: name, save, run, execution status            │
       ├──────────┬───────────────────────────────┬───────────┤
       │ Palette  │       React-Flow canvas       │ Side rail │
       │ (nodes)  │                               │ (params)  │
       ├──────────┴───────────────────────────────┴───────────┤
       │ Execution feed (SSE-streamed, latest at top)         │
       └──────────────────────────────────────────────────────┘

   The canvas reads/writes the canonical graph through the
   existing `/v1/automations/:id/workflows/:wf` routes — the
   engine adapter (stub or live n8n) handles persistence and
   execution under the hood. The component is engine-agnostic.
   ============================================================ */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Play,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Zap,
  History,
  RefreshCcw,
} from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  MarkerType,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";

import { PageHeader, Pill, cx } from "@/components/ui";
import {
  api,
  type ApiCapturedExecution,
  type ApiExecutionEvent,
  type ApiExecutionState,
  type ApiNodeTypeDescriptor,
  type ApiWorkflowGraph,
} from "@/lib/api";

interface Props {
  automationId: string;
  workflowId: string;
}

type NodeData = {
  cantilaType: string;
  label: string;
  parameters: Record<string, unknown>;
  connectionId?: string;
  /** Live execution state painted on the node — drives the colour. */
  runState?: "pending" | "running" | "success" | "failed";
};

const NODE_RUN_TONE: Record<string, string> = {
  pending: "border-border bg-surface-2",
  running: "border-info/60 bg-info/10",
  success: "border-live/60 bg-live/10",
  failed: "border-down/60 bg-down/10",
};

export default function WorkflowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkflowEditorInner({ automationId, workflowId }: Props) {
  const [graph, setGraph] = useState<ApiWorkflowGraph | null>(null);
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [catalog, setCatalog] = useState<ApiNodeTypeDescriptor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [exec, setExec] = useState<ApiExecutionState | null>(null);
  const [events, setEvents] = useState<ApiExecutionEvent[]>([]);
  const sseRef = useRef<EventSource | null>(null);
  // Past-runs panel (plan §15.5 Phase F — captured execution history).
  const [pastRuns, setPastRuns] = useState<ApiCapturedExecution[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const refreshPastRuns = useCallback(async () => {
    setPastLoading(true);
    try {
      const { executions } = await api.listExecutions(automationId, {
        workflowId,
        limit: 20,
      });
      setPastRuns(executions);
    } catch {
      // Best-effort — the editor still works without the history panel.
    } finally {
      setPastLoading(false);
    }
  }, [automationId, workflowId]);
  useEffect(() => {
    void refreshPastRuns();
  }, [refreshPastRuns]);

  /* ----- initial load ----- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ workflow }, { nodeTypes }] = await Promise.all([
          api.loadWorkflow(automationId, workflowId),
          api.listNodeTypes(automationId),
        ]);
        if (cancelled) return;
        setGraph(workflow);
        setCatalog(nodeTypes);
        const built = buildReactFlow(workflow, nodeTypes);
        setNodes(built.nodes);
        setEdges(built.edges);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      sseRef.current?.close();
    };
  }, [automationId, workflowId]);

  /* ----- React-Flow change wiring ----- */

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<NodeData>[]),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      ),
    [],
  );

  /* ----- palette drop ----- */

  const addNodeFromPalette = useCallback(
    (type: ApiNodeTypeDescriptor) => {
      const id = `n_${Math.random().toString(36).slice(2, 10)}`;
      const baseX = 80 + (nodes.length % 5) * 220;
      const baseY = 80 + Math.floor(nodes.length / 5) * 120;
      const newNode: Node<NodeData> = {
        id,
        type: "default",
        position: { x: baseX, y: baseY },
        data: {
          cantilaType: type.id,
          label: type.name,
          parameters: defaultParametersFor(type),
        },
        className: cx(
          "rounded-md border px-3 py-2 text-2xs font-medium text-ink shadow-sm",
          NODE_RUN_TONE.pending,
        ),
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedId(id);
    },
    [nodes.length],
  );

  /* ----- selected node parameter editing ----- */

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );
  const selectedCatalog = useMemo(
    () =>
      selected
        ? catalog.find((c) => c.id === selected.data.cantilaType) ?? null
        : null,
    [catalog, selected],
  );

  const updateSelectedParameter = useCallback(
    (key: string, value: unknown) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id !== selectedId
            ? n
            : {
                ...n,
                data: {
                  ...n.data,
                  parameters: { ...n.data.parameters, [key]: value },
                },
              },
        ),
      );
    },
    [selectedId],
  );

  const updateSelectedConnection = useCallback(
    (connectionId: string | undefined) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id !== selectedId
            ? n
            : { ...n, data: { ...n.data, connectionId } },
        ),
      );
    },
    [selectedId],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedId && e.target !== selectedId,
      ),
    );
    setSelectedId(null);
  }, [selectedId]);

  /* ----- save ----- */

  const save = useCallback(async () => {
    if (!graph) return;
    setSaving(true);
    setError(null);
    try {
      const next: ApiWorkflowGraph = {
        ...graph,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.cantilaType,
          position: n.position,
          parameters: n.data.parameters,
          connectionId: n.data.connectionId,
        })),
        edges: edges.map((e, i) => ({
          id: e.id || `e_${i}`,
          fromNodeId: e.source,
          toNodeId: e.target,
          fromPort: e.sourceHandle ?? undefined,
        })),
      };
      const { workflow } = await api.saveWorkflow(automationId, next);
      setGraph(workflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  }, [automationId, edges, graph, nodes]);

  /* ----- run + stream ----- */

  const run = useCallback(async () => {
    if (!graph) return;
    if (graph.id !== workflowId) {
      // Force a save first so the engine has the latest graph.
      await save();
    }
    setRunning(true);
    setError(null);
    setEvents([]);
    setExec(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, runState: "pending" },
        className: cx(
          "rounded-md border px-3 py-2 text-2xs font-medium text-ink shadow-sm",
          NODE_RUN_TONE.pending,
        ),
      })),
    );
    try {
      const { executionId } = await api.runWorkflow(automationId, workflowId);
      sseRef.current?.close();
      const url = api.executionStreamUrl(automationId, executionId);
      const es = new EventSource(url);
      sseRef.current = es;
      es.onmessage = (msg) => {
        try {
          const ev = JSON.parse(msg.data) as ApiExecutionEvent;
          setEvents((prev) => [ev, ...prev].slice(0, 200));
          if (ev.nodeId) {
            const target: NodeData["runState"] =
              ev.kind === "node_started"
                ? "running"
                : ev.kind === "node_succeeded"
                  ? "success"
                  : ev.kind === "node_failed"
                    ? "failed"
                    : undefined;
            if (target) {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id !== ev.nodeId
                    ? n
                    : {
                        ...n,
                        data: { ...n.data, runState: target },
                        className: cx(
                          "rounded-md border px-3 py-2 text-2xs font-medium text-ink shadow-sm",
                          NODE_RUN_TONE[target],
                        ),
                      },
                ),
              );
            }
          }
          if (ev.kind === "execution_finished") {
            es.close();
            sseRef.current = null;
            setRunning(false);
            // Refresh the canonical execution state once the stream
            // closes so we have the authoritative final shape.
            void api
              .getExecution(automationId, executionId)
              .then((r) => setExec(r.execution))
              .catch(() => {
                // Best-effort — the events feed already shows the outcome.
              });
            // Pull the run into the past-runs panel once the capture
            // finishes (the background task on the control plane writes
            // the terminal status a beat after the SSE closes).
            setTimeout(() => {
              void refreshPastRuns();
            }, 250);
          }
        } catch {
          // Malformed frame — ignore.
        }
      };
      es.onerror = () => {
        es.close();
        sseRef.current = null;
        setRunning(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "run failed");
      setRunning(false);
    }
  }, [automationId, graph, refreshPastRuns, save, workflowId]);

  /* ----- replay a captured run (plan §15.5 Phase F) ----- */

  const replay = useCallback(
    async (sourceExecutionId: string) => {
      setReplayingId(sourceExecutionId);
      setError(null);
      try {
        await api.replayExecution(automationId, sourceExecutionId);
        await refreshPastRuns();
      } catch (err) {
        setError(err instanceof Error ? err.message : "replay failed");
      } finally {
        setReplayingId(null);
      }
    },
    [automationId, refreshPastRuns],
  );

  /* ----- render ----- */

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-2xs text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        loading workflow…
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="space-y-4">
        <Link
          href={`/automations/${automationId}`}
          className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> Back to automation
        </Link>
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error ?? "workflow not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <Link
        href={`/automations/${automationId}`}
        className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" /> Back to automation
      </Link>

      <PageHeader
        eyebrow="Workflow editor"
        title={graph.name}
        lead="Drag nodes from the palette, wire them up, and click Run. Events stream live into the feed below."
        actions={
          <div className="flex items-center gap-2">
            {exec && (
              <Pill
                tone={
                  exec.status === "success"
                    ? "live"
                    : exec.status === "failed"
                      ? "down"
                      : "info"
                }
              >
                <Zap className="h-3 w-3" /> {exec.status}
              </Pill>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-ink hover:border-ember/40 hover:text-ember disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
            <button
              onClick={run}
              disabled={running}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
              Run
            </button>
          </div>
        }
      />

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        {/* palette */}
        <aside className="panel col-span-3 flex min-h-0 flex-col p-0">
          <header className="border-b border-border-soft px-4 py-3">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
              Node palette
            </div>
            <p className="mt-1 text-2xs text-ink-faint">
              {catalog.length} node types · click to add
            </p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <NodePalette catalog={catalog} onAdd={addNodeFromPalette} />
          </div>
        </aside>

        {/* canvas */}
        <div className="panel col-span-6 overflow-hidden p-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        {/* side rail */}
        <aside className="panel col-span-3 flex min-h-0 flex-col p-0">
          {selected && selectedCatalog ? (
            <ParameterRail
              node={selected}
              catalog={selectedCatalog}
              onParameter={updateSelectedParameter}
              onConnection={updateSelectedConnection}
              onDelete={deleteSelected}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
                Inspector
              </div>
              <p className="text-2xs text-ink-faint">
                Click a node to edit its parameters and connection.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* past runs (plan §15.5 Phase F — captured execution history) */}
      <section className="panel max-h-56 overflow-y-auto p-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-soft bg-surface-1 px-4 py-2">
          <div className="flex items-center gap-2">
            <History className="h-3 w-3 text-ink-faint" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
              Past runs
            </span>
            <span className="text-[0.65rem] text-ink-faint">
              ({pastRuns.length})
            </span>
          </div>
          <button
            onClick={refreshPastRuns}
            disabled={pastLoading}
            className="inline-flex h-6 items-center gap-1 rounded-sm border border-border bg-surface-2 px-2 text-[0.65rem] text-ink-dim hover:border-ember/40 hover:text-ember disabled:opacity-50"
          >
            {pastLoading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-2.5 w-2.5" />
            )}
            Refresh
          </button>
        </header>
        {pastRuns.length === 0 ? (
          <div className="px-4 py-3 text-2xs text-ink-faint">
            No past runs yet. Hit Run to record one — Replay re-fires it
            against the engine.
          </div>
        ) : (
          <ul className="divide-y divide-border-soft">
            {pastRuns.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-2 text-2xs"
              >
                <span className="font-mono text-ink-faint">
                  {r.startedAt.slice(11, 19)}
                </span>
                <Pill
                  tone={
                    r.status === "success"
                      ? "live"
                      : r.status === "failed"
                        ? "down"
                        : "info"
                  }
                >
                  {r.status}
                </Pill>
                <span className="flex-1 truncate text-ink-dim">
                  {r.id}
                  {r.replayOfId && (
                    <span className="ml-1 text-ink-faint">
                      · replay of {r.replayOfId.slice(0, 12)}…
                    </span>
                  )}
                </span>
                <span className="text-ink-faint">
                  {r.eventCount} events
                </span>
                <button
                  onClick={() => replay(r.id)}
                  disabled={replayingId !== null}
                  className="inline-flex h-6 items-center gap-1 rounded-sm border border-border bg-surface-2 px-2 text-[0.65rem] text-ink-dim hover:border-ember/40 hover:text-ember disabled:opacity-50"
                  title="Re-run this workflow"
                >
                  {replayingId === r.id ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-2.5 w-2.5" />
                  )}
                  Replay
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* execution feed */}
      <section className="panel max-h-48 overflow-y-auto p-0">
        <header className="sticky top-0 z-10 border-b border-border-soft bg-surface-1 px-4 py-2">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Execution feed
          </div>
        </header>
        {events.length === 0 ? (
          <div className="px-4 py-3 text-2xs text-ink-faint">
            No events yet. Hit Run to start a workflow execution.
          </div>
        ) : (
          <ul className="divide-y divide-border-soft">
            {events.map((ev, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-2 text-2xs"
              >
                <span className="font-mono text-ink-faint">
                  {ev.at.slice(11, 19)}
                </span>
                <Pill
                  tone={
                    ev.kind === "node_succeeded" ||
                    ev.kind === "execution_finished"
                      ? "live"
                      : ev.kind === "node_failed"
                        ? "down"
                        : "info"
                  }
                >
                  {ev.kind.replace(/_/g, " ")}
                </Pill>
                <span className="flex-1 truncate text-ink-dim">
                  {ev.nodeId ?? ev.detail ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   subcomponents
   ============================================================ */

function NodePalette({
  catalog,
  onAdd,
}: {
  catalog: ApiNodeTypeDescriptor[];
  onAdd: (n: ApiNodeTypeDescriptor) => void;
}) {
  const grouped = useMemo(() => {
    const out: Record<string, ApiNodeTypeDescriptor[]> = {};
    for (const n of catalog) {
      (out[n.category] ??= []).push(n);
    }
    return out;
  }, [catalog]);
  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div className="px-2 pt-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">
            {cat}
          </div>
          <ul className="mt-1 space-y-1">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onAdd(n)}
                  className="group flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-surface-2"
                  title={n.blurb}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-surface-3 font-mono text-[0.65rem] text-ember">
                    {n.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-2xs font-medium text-ink">
                      {n.name}
                    </span>
                    <span className="block truncate text-[0.65rem] text-ink-faint">
                      {n.blurb}
                    </span>
                  </span>
                  <Plus className="h-3 w-3 shrink-0 text-ink-faint opacity-0 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ParameterRail({
  node,
  catalog,
  onParameter,
  onConnection,
  onDelete,
}: {
  node: Node<NodeData>;
  catalog: ApiNodeTypeDescriptor;
  onParameter: (key: string, value: unknown) => void;
  onConnection: (id: string | undefined) => void;
  onDelete: () => void;
}) {
  // Pull the parameter schema fields. n8n stub uses
  // `{ type: "object", properties: {…} }`; the live n8n adapter
  // passes an array of properties — we coerce both shapes into a
  // list of { key, spec } pairs.
  const fields = useMemo(() => {
    const out: { key: string; spec: Record<string, unknown> }[] = [];
    const params = catalog.parameters as Record<string, unknown>;
    const props = params?.properties;
    if (props && typeof props === "object" && !Array.isArray(props)) {
      for (const [key, spec] of Object.entries(props as Record<string, unknown>)) {
        out.push({ key, spec: (spec ?? {}) as Record<string, unknown> });
      }
    } else if (Array.isArray(props)) {
      for (const entry of props as Record<string, unknown>[]) {
        const key = String(entry.name ?? entry.key ?? "");
        if (key) out.push({ key, spec: entry });
      }
    }
    return out;
  }, [catalog]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border-soft px-4 py-3">
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
          Inspector
        </div>
        <div className="mt-1 text-sm font-semibold text-ink">{catalog.name}</div>
        <div className="mt-0.5 truncate text-2xs text-ink-faint">
          {node.id} · {catalog.id}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {catalog.requiresConnection && (
          <label className="block">
            <span className="kv">Connection</span>
            <input
              type="text"
              value={node.data.connectionId ?? ""}
              onChange={(e) =>
                onConnection(e.target.value.trim() || undefined)
              }
              placeholder="conn_…"
              className="mt-1 h-8 w-full rounded-md border border-border bg-bg px-2 text-2xs text-ink outline-none focus:border-ember placeholder:text-ink-faint"
            />
            {catalog.connectionProviders && catalog.connectionProviders.length > 0 && (
              <span className="mt-1 block text-[0.65rem] text-ink-faint">
                Providers: {catalog.connectionProviders.join(", ")}
              </span>
            )}
          </label>
        )}

        {fields.length === 0 && (
          <p className="text-2xs text-ink-faint">No parameters.</p>
        )}

        {fields.map(({ key, spec }) => (
          <ParameterField
            key={key}
            name={key}
            spec={spec}
            value={node.data.parameters[key]}
            onChange={(v) => onParameter(key, v)}
          />
        ))}
      </div>

      <footer className="border-t border-border-soft px-4 py-3">
        <button
          onClick={onDelete}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-down/30 bg-down/5 text-2xs font-medium text-down hover:border-down/60"
        >
          <Trash2 className="h-3 w-3" />
          Remove node
        </button>
      </footer>
    </div>
  );
}

function ParameterField({
  name,
  spec,
  value,
  onChange,
}: {
  name: string;
  spec: Record<string, unknown>;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const type = String(spec.type ?? "string");
  const enumOpts = Array.isArray(spec.enum) ? (spec.enum as string[]) : null;
  const description = typeof spec.description === "string" ? spec.description : null;
  const display = typeof spec.displayName === "string" ? spec.displayName : name;

  if (enumOpts) {
    return (
      <label className="block">
        <span className="kv">{display}</span>
        <select
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-border bg-bg px-2 text-2xs text-ink outline-none focus:border-ember"
        >
          <option value="">—</option>
          {enumOpts.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {description && (
          <span className="mt-1 block text-[0.65rem] text-ink-faint">
            {description}
          </span>
        )}
      </label>
    );
  }

  if (type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-2xs text-ink">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        <span>{display}</span>
      </label>
    );
  }

  if (type === "number") {
    return (
      <label className="block">
        <span className="kv">{display}</span>
        <input
          type="number"
          value={value !== undefined ? String(value) : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="mt-1 h-8 w-full rounded-md border border-border bg-bg px-2 text-2xs text-ink outline-none focus:border-ember"
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="kv">{display}</span>
      <input
        type="text"
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-8 w-full rounded-md border border-border bg-bg px-2 text-2xs text-ink outline-none focus:border-ember"
      />
      {description && (
        <span className="mt-1 block text-[0.65rem] text-ink-faint">
          {description}
        </span>
      )}
    </label>
  );
}

/* ============================================================
   helpers
   ============================================================ */

function defaultParametersFor(
  type: ApiNodeTypeDescriptor,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const params = type.parameters as Record<string, unknown>;
  const props = params?.properties;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    for (const [key, spec] of Object.entries(props as Record<string, unknown>)) {
      const s = (spec ?? {}) as Record<string, unknown>;
      if (s.default !== undefined) out[key] = s.default;
    }
  }
  return out;
}

function buildReactFlow(
  graph: ApiWorkflowGraph,
  catalog: ApiNodeTypeDescriptor[],
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const byType = new Map(catalog.map((c) => [c.id, c]));
  const nodes: Node<NodeData>[] = graph.nodes.map((n) => {
    const desc = byType.get(n.type);
    return {
      id: n.id,
      type: "default",
      position: n.position,
      data: {
        cantilaType: n.type,
        label: desc?.name ?? n.type,
        parameters: n.parameters,
        connectionId: n.connectionId,
      },
      className: cx(
        "rounded-md border px-3 py-2 text-2xs font-medium text-ink shadow-sm",
        NODE_RUN_TONE.pending,
      ),
    };
  });
  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: e.id || `e_${i}`,
    source: e.fromNodeId,
    target: e.toNodeId,
    sourceHandle: e.fromPort,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
  return { nodes, edges };
}
