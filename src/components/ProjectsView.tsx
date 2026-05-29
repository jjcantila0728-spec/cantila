"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  MapPin,
  Clock,
  ArrowUpRight,
  Cpu,
  Search,
  Zap,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  RuntimeMark,
  Button,
  cx,
} from "@/components/ui";
import { Sparkline } from "@/components/AreaChart";
import Modal, { Field, inputClass } from "@/components/Modal";
import { projects, REGIONS } from "@/lib/mock-data";
import type {
  Project,
  ProjectMetrics,
  Runtime,
  Region,
} from "@/lib/types";
import {
  api,
  isControlPlaneLive,
  type ApiProject,
  type ApiRuntime,
} from "@/lib/api";

/* ids that have a real detail page (seeded mock data) */
const ORIGINAL_IDS = new Set(projects.map((p) => p.id));

const RUNTIMES: Runtime[] = [
  "Next.js",
  "Node.js",
  "Python",
  "PHP",
  "Static",
  "Docker",
  "Go",
];
const TYPES: Project["type"][] = [
  "Web app",
  "Static site",
  "API",
  "AI agent",
  "Worker",
  "Cron",
];
const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "building", label: "Building" },
  { key: "issues", label: "Needs attention" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function freshMetrics(): ProjectMetrics {
  const wave = (base: number, amp: number) =>
    Array.from({ length: 24 }, (_, i) =>
      Math.max(0, Math.round(base + Math.sin(i / 3.5) * amp)),
    );
  return {
    cpu: wave(9, 5),
    memory: wave(24, 6),
    requests: wave(14, 11),
    latency: wave(46, 13),
    uptimePct: 100,
    reqPerMin: 0,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "new-project"
  );
}

/* Map the Console's display runtime (string label) to the control plane's
 * runtime enum. Anything we can't map falls back to docker so a Dockerfile
 * deploy still succeeds. */
function toApiRuntime(r: Runtime): ApiRuntime {
  switch (r) {
    case "Next.js":
    case "Node.js":
      return "node";
    case "Python":
      return "python";
    case "PHP":
      return "php";
    case "Static":
      return "static";
    case "Docker":
      return "docker";
    case "Go":
      return "go";
    default:
      return "docker";
  }
}

function apiRuntimeToDisplay(r: ApiRuntime): Runtime {
  switch (r) {
    case "node":
      return "Node.js";
    case "python":
      return "Python";
    case "php":
      return "PHP";
    case "static":
      return "Static";
    case "docker":
      return "Docker";
    case "go":
      return "Go";
    default:
      return "Docker";
  }
}

function apiStatusToDisplay(s: ApiProject["status"]): Project["status"] {
  if (s === "provisioning") return "building";
  if (s === "building" || s === "live" || s === "sleeping" || s === "crashed" || s === "paused")
    return s;
  return "building";
}

/* Translate a CP project to the Console's local Project shape so it can
 * render through the same ProjectCard. The metrics are placeholder waves
 * since the CP does not emit metrics yet — clearly marked as `live`. */
function liveProjectToDisplay(p: ApiProject): Project & { live: true; liveId: string } {
  return {
    id: p.slug,
    liveId: p.id,
    live: true,
    name: p.name,
    runtime: apiRuntimeToDisplay(p.runtime),
    region: p.region as Region,
    status: apiStatusToDisplay(p.status),
    url: `${p.slug}.cantila.app`,
    description: "Live project on the Cantila control plane.",
    lastDeployAt: "live",
    createdAt: new Date(p.createdAt).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    }),
    vcpu: p.vcpu,
    memoryMb: p.memoryMb,
    diskGb: p.diskGb,
    autoSleep: p.autoSleep,
    alwaysOn: p.alwaysOn,
    type: "Web app",
    metrics: freshMetrics(),
  };
}

/* ---------- project card ---------- */

type DisplayProject = Project & { live?: true; liveId?: string };

function ProjectCard({ p, handle }: { p: DisplayProject; handle: string | null }) {
  // Live projects always go through the handle-prefixed route. While
  // the handle is still loading we render the card without a link
  // rather than fall back to the deprecated /projects/live/[id] form.
  const href = p.live
    ? handle
      ? `/@${handle}/${encodeURIComponent(p.name)}`
      : undefined
    : ORIGINAL_IDS.has(p.id)
      ? `/projects/${p.id}`
      : undefined;
  const cpuNow = Math.round(p.metrics.cpu[p.metrics.cpu.length - 1]);
  const dimmed = p.status === "sleeping" || p.status === "paused";

  const body = (
    <>
      <div className="flex items-start gap-3">
        <RuntimeMark runtime={p.runtime} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink">
            {p.name}
          </h3>
          <p className="mt-0.5 font-mono text-2xs text-ink-faint">
            {p.live ? (
              <span className="inline-flex items-center gap-1 text-live">
                <Zap className="h-2.5 w-2.5" /> live · control plane
              </span>
            ) : (
              p.type
            )}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <p
        className={cx(
          "text-sm leading-snug",
          dimmed ? "text-ink-faint" : "text-ink-dim",
        )}
      >
        {p.description}
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
        <Cpu className="h-3.5 w-3.5 text-ink-faint" />
        <span className="font-mono text-2xs text-ink-faint">CPU</span>
        <span className="font-mono text-xs font-medium text-ink-dim">
          {cpuNow}%
        </span>
        <div className="ml-auto">
          <Sparkline
            data={p.metrics.cpu}
            tone={cpuNow > 75 ? "warn" : "live"}
            width={120}
            height={24}
          />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3 text-2xs text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {REGIONS[p.region].city}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {p.lastDeployAt}
        </span>
        {href && (
          <span className="inline-flex items-center gap-1 font-medium text-ink-dim opacity-0 transition-opacity group-hover:opacity-100">
            Open
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  const className = cx(
    "panel group flex flex-col gap-4 p-5 transition-all duration-200",
    href && "hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-lift",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* ---------- page ---------- */

const EMPTY_FORM = {
  name: "",
  description: "",
  runtime: "Next.js" as Runtime,
  region: "fsn1" as Region,
  type: "Web app" as Project["type"],
};

export default function ProjectsView() {
  // `null` while we're still detecting the control plane — lets the grid
  // render a skeleton instead of flashing the mock list to a logged-in user.
  const [items, setItems] = useState<DisplayProject[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);

  /* Detect the control plane. In live mode the page renders the user's real
   * projects only — the mock catalog is offline-demo scaffolding and would
   * otherwise pollute a logged-in dashboard with cards that don't navigate
   * (their ids don't exist on the live API). In offline mode the mocks load
   * as before so the demo build still works without a backend. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setItems([...projects]);
        return;
      }
      try {
        const [{ projects: live }, acct] = await Promise.all([
          api.listProjects(),
          api.getAccountMe().catch(() => null),
        ]);
        if (cancelled) return;
        if (acct) setHandle(acct.handle);
        setItems(live.map(liveProjectToDisplay));
      } catch {
        // Live but no projects readable — render the empty state, not mocks.
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loaded: DisplayProject[] = items ?? [];
  const counts = {
    all: loaded.length,
    live: loaded.filter((p) => p.status === "live").length,
    building: loaded.filter((p) => p.status === "building").length,
    issues: loaded.filter(
      (p) => p.status === "crashed" || p.status === "paused",
    ).length,
  };

  const q = query.trim().toLowerCase();
  const filtered = loaded.filter((p) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "live"
          ? p.status === "live"
          : filter === "building"
            ? p.status === "building"
            : p.status === "crashed" || p.status === "paused";
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.runtime.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  async function createProject() {
    const name = form.name.trim();
    if (!name) return;
    setError(null);

    // Live path — create through the control plane so the project actually exists.
    if (liveMode) {
      setCreating(true);
      try {
        const created = await api.createProject({
          name,
          runtime: toApiRuntime(form.runtime),
          region: form.region,
        });
        const display = liveProjectToDisplay(created);
        setItems((prev) => [display, ...(prev ?? [])]);
        setForm(EMPTY_FORM);
        setModalOpen(false);
        setFilter("all");
        setQuery("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "create failed");
      } finally {
        setCreating(false);
      }
      return;
    }

    // Offline fallback — adds a local-only card so the demo still works.
    const id = slugify(name);
    const project: DisplayProject = {
      id,
      name,
      runtime: form.runtime,
      region: form.region,
      status: "building",
      url: `${id}.cantila.app`,
      description:
        form.description.trim() ||
        `A new ${form.type.toLowerCase()} on the Cantila fleet.`,
      lastDeployAt: "just now",
      createdAt: "May 2026",
      vcpu: 1,
      memoryMb: 1024,
      diskGb: 5,
      autoSleep: true,
      alwaysOn: false,
      type: form.type,
      metrics: freshMetrics(),
    };
    setItems((prev) => [project, ...(prev ?? [])]);
    setForm(EMPTY_FORM);
    setModalOpen(false);
    setFilter("all");
    setQuery("");
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Workloads · live mode" : "Workloads"}
        title="Projects"
        lead="Every site, app, agent and worker running on the Cantila fleet."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> connected
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                control plane offline
              </span>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              <Rocket className="h-4 w-4" strokeWidth={2.4} />
              New project
            </button>
          </div>
        }
      />

      {/* controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                  active
                    ? "bg-surface-3 text-ink ring-1 ring-border"
                    : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                )}
              >
                {f.label}
                <span
                  className={cx(
                    "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                    active
                      ? "bg-ember/15 text-ember"
                      : "bg-surface-3 text-ink-faint",
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 sm:w-64">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </div>

      {/* grid */}
      {items === null ? (
        <div className="panel flex items-center justify-center gap-2 py-16 text-2xs text-ink-faint">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading projects…
        </div>
      ) : loaded.length === 0 && liveMode === true ? (
        <div className="panel dot-grid flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember/10 text-ember">
            <Rocket className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <p className="font-display text-base font-semibold text-ink">
            No projects yet
          </p>
          <p className="max-w-sm text-2xs text-ink-faint">
            Cantila is wired up but you haven't shipped anything yet. Spin up
            your first workload — a site, an app, a worker, or an AI agent.
          </p>
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            className="mt-1"
          >
            <Rocket className="h-4 w-4" strokeWidth={2.4} />
            Create your first project
          </Button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} p={p} handle={handle} />
          ))}
        </div>
      ) : (
        <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm font-medium text-ink">No projects match</p>
          <p className="text-2xs text-ink-faint">
            Try a different filter or search term.
          </p>
          <button
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
            className="mt-1 text-2xs font-medium text-ember hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* new project modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New project"
        description="Provision a workload on the Cantila fleet."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createProject}
              disabled={!form.name.trim() || creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" strokeWidth={2.4} />
              )}
              {liveMode ? "Create on control plane" : "Create project"}
            </Button>
          </>
        }
      >
        <Field label="Project name">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") createProject();
            }}
            placeholder="my-new-app"
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <input
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="What does it do?"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Runtime">
            <select
              value={form.runtime}
              onChange={(e) =>
                setForm({ ...form, runtime: e.target.value as Runtime })
              }
              className={inputClass}
            >
              {RUNTIMES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as Project["type"],
                })
              }
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Region">
          <select
            value={form.region}
            onChange={(e) =>
              setForm({ ...form, region: e.target.value as Region })
            }
            className={inputClass}
          >
            {(Object.keys(REGIONS) as Region[]).map((r) => (
              <option key={r} value={r}>
                {r} — {REGIONS[r].city}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <p className="rounded-md border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
