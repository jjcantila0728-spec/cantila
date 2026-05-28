"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  RotateCw,
  MoreHorizontal,
  Cpu,
  MemoryStick,
  HardDrive,
  MapPin,
  Database as DatabaseIcon,
  Globe,
  Plus,
  Lock,
  Trash2,
  Pause,
  TriangleAlert,
  Clock,
  Activity,
  ShieldCheck,
  Link2,
} from "lucide-react";
import type {
  Project,
  Deployment,
  EnvVar,
  LogLine,
  Domain,
  Database,
} from "@/lib/types";
import { StatusBadge, RuntimeMark, Pill, cx, Meter, Button } from "./ui";
import { AreaChart } from "./AreaChart";
import DeployList, { TRIGGER } from "./DeployList";
import LogStream from "./LogStream";
import Modal, { Field, inputClass } from "./Modal";
import { REGIONS } from "@/lib/mock-data";

const TABS = [
  "Overview",
  "Deployments",
  "Logs",
  "Metrics",
  "Environment",
  "Domains",
  "Settings",
] as const;
type Tab = (typeof TABS)[number];

/* ---------- small switch ---------- */
function Switch({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cx(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-ember" : "bg-surface-3",
      )}
      role="switch"
      aria-checked={on}
    >
      <span
        className={cx(
          "absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export default function ProjectView({
  project,
  deployments,
  envVars,
  logs,
  domains,
  database,
}: {
  project: Project;
  deployments: Deployment[];
  envVars: EnvVar[];
  logs: LogLine[];
  domains: Domain[];
  database?: Database;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [autoSleep, setAutoSleep] = useState(project.autoSleep);
  const [alwaysOn, setAlwaysOn] = useState(project.alwaysOn);
  const [redeploying, setRedeploying] = useState(false);

  function redeploy() {
    if (redeploying) return;
    setRedeploying(true);
    setTimeout(() => setRedeploying(false), 2600);
  }

  const m = project.metrics;
  const live = deployments.find((d) => d.status === "live") ?? deployments[0];

  return (
    <div className="space-y-7">
      {/* ---------- header ---------- */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-faint transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="scale-110">
              <RuntimeMark runtime={project.runtime} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {project.name}
                </h1>
                <StatusBadge status={project.status} />
              </div>
              <a
                href={`https://${project.url}`}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-ink-dim transition-colors hover:text-ember"
              >
                {project.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              <p className="mt-2 max-w-xl text-sm text-ink-dim">
                {project.description}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`https://${project.url}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-ink transition-colors hover:border-ink-faint"
            >
              <ExternalLink className="h-4 w-4" />
              Visit
            </a>
            <button
              onClick={redeploy}
              disabled={redeploying}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:cursor-default disabled:opacity-70"
            >
              <RotateCw
                className={cx("h-4 w-4", redeploying && "animate-spin")}
                strokeWidth={2.4}
              />
              {redeploying ? "Deploying…" : "Redeploy"}
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-dim hover:text-ink">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------- quick stats ---------- */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
        {[
          {
            k: "Uptime · 30d",
            v: `${m.uptimePct}%`,
            icon: ShieldCheck,
          },
          {
            k: "Requests / min",
            v: m.reqPerMin.toLocaleString(),
            icon: Activity,
          },
          {
            k: "Region",
            v: project.region,
            sub: REGIONS[project.region].city,
            icon: MapPin,
          },
          {
            k: "Last deploy",
            v: project.lastDeployAt,
            icon: Clock,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.k} className="bg-surface px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-ink-faint">
                <Icon className="h-3.5 w-3.5" />
                <span className="kv">{s.k}</span>
              </div>
              <div className="mt-1.5 font-mono text-base font-semibold text-ink">
                {s.v}
              </div>
              {s.sub && (
                <div className="text-2xs text-ink-faint">{s.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------- tab bar ---------- */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "relative whitespace-nowrap px-3.5 py-2.5 text-sm transition-colors",
              tab === t
                ? "font-medium text-ink"
                : "text-ink-faint hover:text-ink-dim",
            )}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ember" />
            )}
          </button>
        ))}
      </div>

      {/* ---------- tab content ---------- */}
      <div className="animate-fade-in">
        {tab === "Overview" && (
          <OverviewTab
            project={project}
            deployments={deployments}
            live={live}
            database={database}
            domains={domains}
          />
        )}

        {tab === "Deployments" && (
          <div className="panel overflow-hidden p-0">
            <div className="border-b border-border-soft px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-ink">
                Deployment history
              </h2>
            </div>
            <DeployList deployments={deployments} detailed />
          </div>
        )}

        {tab === "Logs" && <LogStream initial={logs} />}

        {tab === "Metrics" && <MetricsTab project={project} />}

        {tab === "Environment" && <EnvTab initial={envVars} />}

        {tab === "Domains" && (
          <DomainsTab initial={domains} projectId={project.id} />
        )}

        {tab === "Settings" && (
          <SettingsTab
            project={project}
            autoSleep={autoSleep}
            alwaysOn={alwaysOn}
            onAutoSleep={() => setAutoSleep((v) => !v)}
            onAlwaysOn={() => setAlwaysOn((v) => !v)}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Tabs
   ============================================================ */

function OverviewTab({
  project,
  deployments,
  live,
  database,
  domains,
}: {
  project: Project;
  deployments: Deployment[];
  live?: Deployment;
  database?: Database;
  domains: Domain[];
}) {
  const primaryDomain = domains.find((d) => d.primary) ?? domains[0];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* current production deployment */}
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">
              Production deployment
            </h2>
            {live && <StatusBadge status={live.status} />}
          </div>
          {live ? (
            <>
              <p className="text-sm text-ink">{live.commitMessage}</p>
              <div className="mt-4 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
                {[
                  { k: "Commit", v: live.commitHash, mono: true },
                  { k: "Branch", v: live.branch, mono: true },
                  { k: "Trigger", v: TRIGGER[live.trigger].label },
                  { k: "Build time", v: `${live.durationSec}s` },
                ].map((x) => (
                  <div key={x.k}>
                    <div className="kv">{x.k}</div>
                    <div
                      className={cx(
                        "mt-1 text-sm text-ink",
                        x.mono && "font-mono",
                      )}
                    >
                      {x.v}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-faint">No deployments yet.</p>
          )}
        </div>

        {/* recent deploys */}
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-border-soft px-5 py-3.5">
            <h2 className="font-display text-sm font-semibold text-ink">
              Recent deployments
            </h2>
          </div>
          <DeployList deployments={deployments.slice(0, 4)} />
        </div>
      </div>

      {/* side */}
      <div className="space-y-6">
        <div className="panel p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">
            Compute
          </h2>
          <div className="space-y-3">
            <ResourceRow
              icon={Cpu}
              label="vCPU"
              value={`${project.vcpu} cores`}
            />
            <ResourceRow
              icon={MemoryStick}
              label="Memory"
              value={`${project.memoryMb / 1024} GB`}
            />
            <ResourceRow
              icon={HardDrive}
              label="Disk"
              value={`${project.diskGb} GB SSD`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border-soft pt-4">
            <Pill tone={project.alwaysOn ? "live" : "neutral"}>
              {project.alwaysOn ? "Always-on" : "Scales to zero"}
            </Pill>
            {project.autoSleep && <Pill tone="violet">Auto-sleep</Pill>}
            <Pill tone="neutral">{project.type}</Pill>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">
            Linked services
          </h2>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
              <Globe className="h-4 w-4 text-info" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs text-ink">
                  {primaryDomain?.name ?? "—"}
                </div>
                <div className="text-2xs text-ink-faint">
                  Domain · SSL active
                </div>
              </div>
            </div>
            {database ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
                <DatabaseIcon className="h-4 w-4 text-violet" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-ink">
                    {database.name}
                  </div>
                  <div className="text-2xs text-ink-faint">
                    {database.engine} {database.version} · {database.usedGb} /{" "}
                    {database.sizeGb} GB
                  </div>
                </div>
              </div>
            ) : (
              <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-2xs text-ink-faint hover:border-ink-faint hover:text-ink-dim">
                <Plus className="h-3.5 w-3.5" />
                Attach a database
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-ink-faint" />
      <span className="text-sm text-ink-dim">{label}</span>
      <span className="ml-auto font-mono text-sm text-ink">{value}</span>
    </div>
  );
}

function MetricsTab({ project }: { project: Project }) {
  const m = project.metrics;
  const charts: {
    title: string;
    data: number[];
    tone: "ember" | "live" | "info" | "violet";
    fmt: (n: number) => string;
  }[] = [
    { title: "CPU", data: m.cpu, tone: "ember", fmt: (n) => `${Math.round(n)}%` },
    {
      title: "Memory",
      data: m.memory,
      tone: "violet",
      fmt: (n) => `${Math.round(n)}%`,
    },
    {
      title: "Requests / hour",
      data: m.requests,
      tone: "info",
      fmt: (n) => Math.round(n).toLocaleString(),
    },
    {
      title: "Latency p95",
      data: m.latency,
      tone: "live",
      fmt: (n) => `${Math.round(n)} ms`,
    },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {charts.map((c, i) => {
        const last = c.data[c.data.length - 1];
        return (
          <div key={c.title} className="panel p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="kv">{c.title}</h3>
              <span className="font-mono text-base font-semibold text-ink">
                {c.fmt(last)}
              </span>
            </div>
            <div className="mt-3">
              <AreaChart
                data={c.data}
                id={`metric-${project.id}-${i}`}
                tone={c.tone}
                height={120}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-2xs text-ink-faint">
              <span>24h ago</span>
              <span>now</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EnvTab({ initial }: { initial: EnvVar[] }) {
  const [vars, setVars] = useState<EnvVar[]>(() => [...initial]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    key: string;
    value: string;
    scope: EnvVar["scope"];
    secret: boolean;
  }>({ key: "", value: "", scope: "all", secret: true });

  function addVar() {
    const key = form.key.trim();
    if (!key) return;
    const variable: EnvVar = {
      key,
      preview: form.secret
        ? "••••••••••••"
        : form.value.trim() || "(empty)",
      scope: form.scope,
      updatedAt: "just now",
      secret: form.secret,
    };
    setVars((prev) => [variable, ...prev]);
    setForm({ key: "", value: "", scope: "all", secret: true });
    setOpen(false);
  }

  return (
    <div className="panel overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border-soft px-5 py-3.5">
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">
            Environment & secrets
          </h2>
          <p className="mt-0.5 text-2xs text-ink-faint">
            Encrypted at rest · never printed to logs · scoped per environment
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
        >
          <Plus className="h-3.5 w-3.5" />
          Add variable
        </button>
      </div>
      <div className="hidden grid-cols-[1.4fr_1.6fr_0.7fr_0.7fr] gap-4 border-b border-border-soft px-5 py-2 kv md:grid">
        <span>Key</span>
        <span>Value</span>
        <span>Scope</span>
        <span>Updated</span>
      </div>
      <div className="divide-y divide-border-soft">
        {vars.map((e, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-1.5 px-5 py-3 md:grid-cols-[1.4fr_1.6fr_0.7fr_0.7fr] md:items-center md:gap-4"
          >
            <span className="flex items-center gap-1.5 font-mono text-xs font-medium text-ink">
              {e.secret && <Lock className="h-3 w-3 text-ember" />}
              {e.key}
            </span>
            <span className="truncate font-mono text-xs text-ink-dim">
              {e.preview}
            </span>
            <span>
              <Pill tone={e.scope === "production" ? "ember" : "neutral"}>
                {e.scope}
              </Pill>
            </span>
            <span className="font-mono text-2xs text-ink-faint">
              {e.updatedAt}
            </span>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add environment variable"
        description="Scoped, encrypted at rest, applied on next deploy."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={addVar}
              disabled={!form.key.trim()}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Add variable
            </Button>
          </>
        }
      >
        <Field label="Key">
          <input
            autoFocus
            value={form.key}
            onChange={(e) =>
              setForm({ ...form, key: e.target.value.toUpperCase() })
            }
            placeholder="DATABASE_URL"
            className={cx(inputClass, "font-mono")}
          />
        </Field>
        <Field label="Value">
          <input
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") addVar();
            }}
            placeholder="postgres://…"
            className={cx(inputClass, "font-mono")}
          />
        </Field>
        <Field label="Scope">
          <select
            value={form.scope}
            onChange={(e) =>
              setForm({ ...form, scope: e.target.value as EnvVar["scope"] })
            }
            className={inputClass}
          >
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="preview">Preview</option>
          </select>
        </Field>
        <label className="flex items-center justify-between">
          <span>
            <span className="kv">Secret</span>
            <span className="mt-0.5 block text-2xs text-ink-faint">
              Mask the value in the UI and logs.
            </span>
          </span>
          <Switch
            on={form.secret}
            onToggle={() => setForm({ ...form, secret: !form.secret })}
          />
        </label>
      </Modal>
    </div>
  );
}

function DomainsTab({
  initial,
  projectId,
}: {
  initial: Domain[];
  projectId: string;
}) {
  const [items, setItems] = useState<Domain[]>(() => [...initial]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function addDomain() {
    const n = name.trim().toLowerCase().replace(/\s+/g, "");
    if (!n) return;
    const domain: Domain = {
      name: n,
      kind: "custom",
      projectId,
      ssl: "issuing",
      dns: "pending",
      primary: false,
    };
    setItems((prev) => [...prev, domain]);
    setName("");
    setOpen(false);
  }

  return (
    <div className="panel overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border-soft px-5 py-3.5">
        <h2 className="font-display text-sm font-semibold text-ink">Domains</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
        >
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </button>
      </div>
      <div className="divide-y divide-border-soft">
        {items.map((d) => (
          <div key={d.name} className="flex items-center gap-3 px-5 py-3.5">
            <Globe className="h-4 w-4 shrink-0 text-info" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-sm text-ink">
                  {d.name}
                </span>
                {d.primary && <Pill tone="ember">Primary</Pill>}
              </div>
              <div className="mt-0.5 text-2xs text-ink-faint">
                {d.kind === "subdomain" ? "Cantila subdomain" : "Custom domain"}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Pill tone={d.ssl === "active" ? "live" : "warn"}>
                <Lock className="h-3 w-3" />
                {d.ssl === "active" ? "SSL active" : "SSL issuing"}
              </Pill>
              <Pill tone={d.dns === "wired" ? "info" : "neutral"}>
                <Link2 className="h-3 w-3" />
                DNS {d.dns}
              </Pill>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a domain"
        description="Cantila issues SSL and wires DNS automatically."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addDomain} disabled={!name.trim()}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Add domain
            </Button>
          </>
        }
      >
        <Field label="Domain">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addDomain();
            }}
            placeholder="app.example.com"
            className={inputClass}
          />
        </Field>
      </Modal>
    </div>
  );
}

function SettingsTab({
  project,
  autoSleep,
  alwaysOn,
  onAutoSleep,
  onAlwaysOn,
}: {
  project: Project;
  autoSleep: boolean;
  alwaysOn: boolean;
  onAutoSleep: () => void;
  onAlwaysOn: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* compute */}
      <div className="panel p-5">
        <h2 className="font-display text-sm font-semibold text-ink">Compute</h2>
        <p className="mt-0.5 text-2xs text-ink-faint">
          Resize vertically without a rebuild — changes apply on next request.
        </p>
        <div className="mt-4 space-y-4">
          {[
            { k: "vCPU", v: project.vcpu, max: 8, unit: "cores", pct: (project.vcpu / 8) * 100 },
            {
              k: "Memory",
              v: project.memoryMb / 1024,
              max: 16,
              unit: "GB",
              pct: (project.memoryMb / 1024 / 16) * 100,
            },
            { k: "Disk", v: project.diskGb, max: 50, unit: "GB", pct: (project.diskGb / 50) * 100 },
          ].map((r) => (
            <div key={r.k}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-ink-dim">{r.k}</span>
                <span className="font-mono text-ink">
                  {r.v} {r.unit}
                </span>
              </div>
              <Meter value={r.pct} tone="ember" />
            </div>
          ))}
        </div>
      </div>

      {/* behaviour */}
      <div className="panel p-5">
        <h2 className="font-display text-sm font-semibold text-ink">
          Runtime behaviour
        </h2>
        <p className="mt-0.5 text-2xs text-ink-faint">
          Control how this workload uses fleet capacity.
        </p>
        <div className="mt-4 divide-y divide-border-soft">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-ink">Auto-sleep when idle</div>
              <div className="text-2xs text-ink-faint">
                Pause the container after inactivity; wake on first request.
              </div>
            </div>
            <Switch on={autoSleep} onToggle={onAutoSleep} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-ink">Always-on</div>
              <div className="text-2xs text-ink-faint">
                Keep at least one instance pinned for production traffic.
              </div>
            </div>
            <Switch on={alwaysOn} onToggle={onAlwaysOn} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-ink">Health checks</div>
              <div className="text-2xs text-ink-faint">
                Auto-restart and reschedule off unhealthy nodes.
              </div>
            </div>
            <Switch on={true} onToggle={() => {}} />
          </div>
        </div>
      </div>

      {/* danger zone */}
      <div className="rounded-xl border border-down/30 bg-down/5 p-5 lg:col-span-2">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-down" />
          <h2 className="font-display text-sm font-semibold text-down">
            Danger zone
          </h2>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 text-sm text-ink-dim hover:text-ink">
            <Pause className="h-4 w-4" />
            Pause project
          </button>
          <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-down/40 bg-down/10 px-3.5 text-sm font-medium text-down hover:bg-down/20">
            <Trash2 className="h-4 w-4" />
            Delete {project.name}
          </button>
        </div>
      </div>
    </div>
  );
}
