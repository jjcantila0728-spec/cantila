"use client";

/* ============================================================
   Live project detail — renders a real Cantila control-plane project.
   Powers /projects/live/[id], where [id] is a `prj_*` id from the CP.
   ============================================================ */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Rocket,
  Globe,
  Database as DbIcon,
  Mail,
  MessageSquare,
  Cpu,
  RefreshCw,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitBranch,
  Github,
  Send,
  Unlink,
  ShoppingCart,
  Search,
  Sparkles,
  KeyRound,
  Archive,
  Trash2,
} from "lucide-react";
import { Button, PageHeader, StatusBadge, cx } from "./ui";
import Modal, { Field, inputClass } from "./Modal";
import CopyButton, { CopyField } from "./CopyButton";
import {
  api,
  ApiError,
  deployStream,
  type ApiProjectDetail,
  type ApiEnvVar,
  type ApiTroubleshootResult,
  type ApiDeployment,
  type ApiBackup,
} from "../lib/api";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "deployments", label: "Deployments" },
  { key: "previews", label: "Previews" },
  { key: "env", label: "Environment" },
  { key: "domains", label: "Domains" },
  { key: "git", label: "Git" },
  { key: "backups", label: "Backups" },
  { key: "services", label: "Services" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function LiveProjectView({ projectId }: { projectId: string }) {
  const [detail, setDetail] = useState<ApiProjectDetail | null>(null);
  const [env, setEnv] = useState<ApiEnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [deploying, setDeploying] = useState(false);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [domainModal, setDomainModal] = useState(false);
  const [envModal, setEnvModal] = useState(false);
  const [scaleModal, setScaleModal] = useState(false);
  const [gitModal, setGitModal] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [buyModal, setBuyModal] = useState(false);
  const [troubleshooting, setTroubleshooting] = useState<string | null>(null);
  const [troubleshootResult, setTroubleshootResult] =
    useState<ApiTroubleshootResult | null>(null);
  /** Which AI analyser is wired (`{label, live}` from `/v1/ai/info`).
   *  Lazy-fetched on first troubleshoot so the cost is paid only when
   *  the panel is actually opened. */
  const [aiInfo, setAiInfo] = useState<{ label: string; live: boolean } | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const deployCancel = useRef<(() => void) | null>(null);

  // Abort an in-flight stream if the user navigates away.
  useEffect(() => () => deployCancel.current?.(), []);

  const load = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([
        api.getProject(projectId),
        api.listEnv(projectId),
      ]);
      setDetail(d);
      setEnv(e.env);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "failed to load project";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function runDeploy() {
    setDeploying(true);
    setLiveSteps([]);
    setTab("deployments");
    const cancel = deployStream(
      projectId,
      { trigger: "chat" },
      {
        onStep: (e) => {
          setLiveSteps((prev) => [...prev, e.step]);
        },
        onDone: (outcome) => {
          setDeploying(false);
          setToast(
            outcome.status === "live" ? "Deploy live" : "Deploy failed",
          );
          void load();
          window.setTimeout(() => setLiveSteps([]), 4000);
          window.setTimeout(() => setToast(null), 3500);
        },
        onError: (msg) => {
          setDeploying(false);
          setToast(msg);
          window.setTimeout(() => setToast(null), 4000);
        },
      },
    );
    // Allow cancel on unmount via a closure attached to the cleanup ref.
    deployCancel.current = cancel;
  }

  async function disconnectGit() {
    try {
      await api.disconnectGit(projectId);
      setToast("Git disconnected");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "disconnect failed");
    } finally {
      void load();
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  async function simulatePush() {
    setPushing(true);
    try {
      const result = await api.simulatePush(projectId, {
        commit: {
          hash: shortHash(),
          message: `console push at ${new Date().toLocaleTimeString()}`,
          author: "Console",
        },
      });
      if ("skipped" in result && result.skipped) {
        setToast(result.error);
      } else if ("error" in result) {
        setToast(result.error);
      } else {
        setToast(`Pushed — deployment ${result.deploymentId}`);
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "push failed");
    } finally {
      setPushing(false);
      void load();
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  async function troubleshoot(deploymentId: string) {
    setTroubleshooting(deploymentId);
    setTroubleshootResult(null);
    // Lazy-fetch which AI analyser is wired — only on first use.
    if (!aiInfo) {
      void api.getAiInfo().then(setAiInfo).catch(() => undefined);
    }
    try {
      const result = await api.troubleshootDeploy(projectId, deploymentId);
      setTroubleshootResult(result);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "troubleshoot failed");
      window.setTimeout(() => setToast(null), 4000);
    } finally {
      setTroubleshooting(null);
    }
  }

  async function rollback(deploymentId: string) {
    setRollingBack(deploymentId);
    try {
      await api.rollback(projectId, deploymentId);
      setToast(`Rolled back to ${deploymentId}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "rollback failed");
    } finally {
      setRollingBack(null);
      void load();
      window.setTimeout(() => setToast(null), 3500);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-ink-dim">
        <Loader2 className="h-4 w-4 animate-spin text-ember" />
        Loading project from control plane…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="panel p-8 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-down" />
        <p className="mt-3 font-display text-base font-semibold text-ink">
          Could not load project
        </p>
        <p className="mt-1 text-2xs text-ink-faint">{error}</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-1 text-2xs font-medium text-ember hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
        </Link>
      </div>
    );
  }

  const { project, services, deployments, domains } = detail;
  const primaryDomain = domains.find((d) => d.primary) ?? domains[0];

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All projects
      </Link>

      <PageHeader
        eyebrow="LIVE · CONTROL PLANE"
        title={project.name}
        lead={
          primaryDomain
            ? `https://${primaryDomain.hostname}`
            : `${project.slug}.cantila.app (no domain yet)`
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-2xs font-medium text-ink-dim hover:border-ink-faint hover:text-ink"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={runDeploy}
              disabled={deploying}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright disabled:opacity-60"
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" strokeWidth={2.4} />
              )}
              Deploy
            </button>
          </div>
        }
      />

      {toast && (
        <div className="panel flex items-center gap-2 border-live/30 bg-live/5 px-4 py-3 text-2xs font-medium text-live">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {toast}
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
        <Stat label="Status" value={<StatusBadge status={project.status} />} />
        <Stat label="Runtime" value={project.runtime} />
        <Stat label="Region" value={project.region} />
        <Stat label="vCPU" value={String(project.vcpu)} />
        <Stat label="RAM" value={`${project.memoryMb} MB`} />
        <Stat label="Disk" value={`${project.diskGb} GB`} />
        <Stat
          label="Mode"
          value={project.alwaysOn ? "always-on" : "auto-sleep"}
        />
        <Stat label="Deployments" value={String(deployments.length)} />
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              "relative h-9 px-3 text-xs font-medium transition-colors",
              tab === t.key
                ? "text-ink"
                : "text-ink-faint hover:text-ink-dim",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-ember" />
            )}
          </button>
        ))}
      </div>

      {/* tab body */}
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <ServiceCard
            icon={DbIcon}
            title="Database"
            body={
              services.database
                ? [
                    `${services.database.engine} ${services.database.version}`,
                    services.database.connectionUri,
                  ]
                : ["Not provisioned"]
            }
            status={services.database?.status}
            action={
              <button
                onClick={() => setScaleModal(true)}
                className="text-2xs font-medium text-ember hover:underline"
              >
                Scale
              </button>
            }
          />
          <ServiceCard
            icon={Mail}
            title="Email"
            body={
              services.mailbox
                ? [
                    services.mailbox.address,
                    `${services.mailbox.smtpHost} · ${services.mailbox.smtpUser}`,
                  ]
                : ["Not provisioned"]
            }
            status={services.mailbox?.status}
          />
          <ServiceCard
            icon={MessageSquare}
            title="SMS"
            body={
              services.phoneNumber
                ? [
                    services.phoneNumber.e164,
                    `API key: ${services.phoneNumber.apiKey}`,
                  ]
                : ["Not provisioned"]
            }
            status={services.phoneNumber?.status}
          />
          <ServiceCard
            icon={Cpu}
            title="Resources"
            body={[
              `${project.vcpu} vCPU · ${project.memoryMb} MB · ${project.diskGb} GB`,
              project.alwaysOn ? "Pinned always-on" : "Sleeps on idle",
            ]}
            action={
              <button
                onClick={() => setScaleModal(true)}
                className="text-2xs font-medium text-ember hover:underline"
              >
                Resize
              </button>
            }
          />
        </div>
      )}

      {tab === "deployments" && (
        <div className="space-y-3">
          {(deploying || liveSteps.length > 0) && (
            <div className="panel border-ember/30 bg-ember/5 px-4 py-3">
              <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ember">
                {deploying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {deploying ? "Streaming live" : "Stream complete"}
              </div>
              <div className="mt-2 space-y-0.5 rounded border border-border-soft bg-[#0a0b0d] px-3 py-2 font-mono text-2xs">
                {liveSteps.length === 0 ? (
                  <div className="text-ink-faint">waiting for the first step…</div>
                ) : (
                  liveSteps.map((s, i) => (
                    <div
                      key={i}
                      className="animate-fade-in text-ink-dim"
                    >
                      <span className="text-ember">▸</span> {s}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="panel divide-y divide-border">
          {deployments.length === 0 ? (
            <p className="p-6 text-center text-2xs text-ink-faint">
              No deployments yet. Hit Deploy to ship.
            </p>
          ) : (
            deployments.map((d, idx) => {
              const canRollback =
                d.status === "superseded" ||
                (d.status === "live" && idx > 0);
              return (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-2xs text-ink-dim">
                          {d.id}
                        </code>
                        <DeployStatusBadge status={d.status} />
                        <span className="text-2xs text-ink-faint">
                          via {d.trigger}
                        </span>
                      </div>
                      {d.url && (
                        <a
                          href={d.url}
                          className="mt-0.5 inline-block font-mono text-2xs text-live hover:underline"
                        >
                          {d.url}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs text-ink-faint">
                        {d.nodeId}
                      </span>
                      <button
                        onClick={() => troubleshoot(d.id)}
                        disabled={troubleshooting !== null}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-2xs font-medium text-ink-dim hover:border-ember/40 hover:text-ember disabled:opacity-50"
                        title="Analyse this deployment with AI"
                      >
                        {troubleshooting === d.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Troubleshoot
                      </button>
                      {canRollback && (
                        <button
                          onClick={() => rollback(d.id)}
                          disabled={rollingBack !== null}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-2xs font-medium text-ink-dim hover:border-ember/40 hover:text-ember disabled:opacity-50"
                          title="Roll back to this deployment"
                        >
                          {rollingBack === d.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                  {d.logs.length > 0 && (
                    <div className="mt-2 space-y-0.5 rounded border border-border-soft bg-[#0a0b0d] px-3 py-2 font-mono text-2xs text-ink-faint">
                      {d.logs.map((l, i) => (
                        <div key={i}>▸ {l}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {tab === "previews" && (
        <PreviewsPanel
          projectId={projectId}
          onToast={(msg) => {
            setToast(msg);
            window.setTimeout(() => setToast(null), 3500);
          }}
        />
      )}

      {tab === "backups" && (
        <BackupsPanel
          projectId={projectId}
          onToast={(msg) => {
            setToast(msg);
            window.setTimeout(() => setToast(null), 3500);
          }}
          onRestored={() => void load()}
        />
      )}

      {tab === "env" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-2xs text-ink-dim">
              {env.length} variable{env.length === 1 ? "" : "s"} — secrets are
              masked.
            </p>
            <Button variant="primary" onClick={() => setEnvModal(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Add variable
            </Button>
          </div>
          <div className="panel divide-y divide-border">
            {env.length === 0 ? (
              <p className="p-6 text-center text-2xs text-ink-faint">
                No environment variables yet.
              </p>
            ) : (
              env.map((v) => (
                <div
                  key={v.key + v.scope}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <code className="font-mono text-xs text-ink">{v.key}</code>
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-2xs text-ink-dim">
                      {v.value}
                    </code>
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">
                      {v.scope}
                    </span>
                    {v.secret && (
                      <span className="rounded bg-ember/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-ember">
                        secret
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "domains" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xs text-ink-dim">
              {domains.length} domain{domains.length === 1 ? "" : "s"} attached
              to this project.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBuyModal(true)}>
                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.4} />
                Buy a domain
              </Button>
              <Button variant="primary" onClick={() => setDomainModal(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Add domain
              </Button>
            </div>
          </div>
          <div className="panel divide-y divide-border">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-ink-faint" />
                  <code className="font-mono text-xs text-ink">
                    {d.hostname}
                  </code>
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">
                    {d.kind}
                  </span>
                  {d.primary && (
                    <span className="rounded bg-ember/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-ember">
                      primary
                    </span>
                  )}
                </div>
                <span
                  className={cx(
                    "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                    d.sslActive
                      ? "bg-live/15 text-live"
                      : "bg-warn/15 text-warn",
                  )}
                >
                  SSL {d.sslActive ? "active" : "issuing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "git" && (
        <div className="space-y-3">
          {project.repoUrl ? (
            <div className="panel space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-ink-dim" />
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-ink hover:underline"
                    >
                      {project.repoUrl}
                    </a>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-2xs text-ink-faint">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      branch
                      <code className="font-mono text-ink-dim">
                        {project.branch ?? "main"}
                      </code>
                    </span>
                    <span
                      className={cx(
                        "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                        project.autoDeploy
                          ? "bg-live/15 text-live"
                          : "bg-surface-3 text-ink-faint",
                      )}
                    >
                      auto-deploy {project.autoDeploy ? "on" : "off"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={simulatePush}
                    disabled={pushing}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember/10 border border-ember/30 px-3 text-2xs font-semibold text-ember hover:bg-ember/20 disabled:opacity-60"
                  >
                    {pushing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Simulate push
                  </button>
                  <button
                    onClick={disconnectGit}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-2xs font-medium text-ink-dim hover:border-down/40 hover:text-down"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-2xs text-ink-faint">
                Webhook URL (point your provider here):
                <div className="mt-1 flex items-center gap-2 break-all font-mono text-ink-dim">
                  <code>
                    POST /api/cantila/v1/projects/{project.id}/git/webhook
                  </code>
                </div>
              </div>
              {deployments.some((d) => d.commitHash) && (
                <div className="space-y-1">
                  <p className="text-2xs text-ink-dim">Recent commits</p>
                  <div className="space-y-1 font-mono text-2xs">
                    {deployments
                      .filter((d) => d.commitHash)
                      .slice(0, 5)
                      .map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-2 rounded border border-border-soft bg-surface-2 px-2 py-1"
                        >
                          <code className="text-ember">{d.commitHash}</code>
                          <span className="text-ink-faint">
                            ({d.branch ?? "—"})
                          </span>
                          <span className="truncate text-ink-dim">
                            {d.commitMessage ?? ""}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel space-y-3 p-6 text-center">
              <GitBranch className="mx-auto h-8 w-8 text-ink-faint" />
              <p className="font-display text-base font-semibold text-ink">
                Connect a repository
              </p>
              <p className="mx-auto max-w-sm text-2xs text-ink-faint">
                Push to the configured branch and Cantila will build &amp; deploy
                automatically. (Plan §5.1 — git-based deploys.)
              </p>
              <div className="flex justify-center">
                <Button variant="primary" onClick={() => setGitModal(true)}>
                  <Github className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Connect repo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "services" && (
        <div className="grid gap-4 md:grid-cols-3">
          <ServiceCard
            icon={DbIcon}
            title="Managed database"
            body={
              services.database
                ? [
                    `${services.database.engine} ${services.database.version}`,
                    services.database.connectionUri,
                    `Created ${formatRelative(services.database.createdAt)}`,
                  ]
                : ["Not provisioned — deploy to wire one up."]
            }
            status={services.database?.status}
          />
          <ServiceCard
            icon={Mail}
            title="Mailbox"
            body={
              services.mailbox
                ? [
                    services.mailbox.address,
                    services.mailbox.smtpHost,
                    services.mailbox.smtpUser,
                  ]
                : ["Not provisioned"]
            }
            status={services.mailbox?.status}
          />
          <ServiceCard
            icon={MessageSquare}
            title="SMS number"
            body={
              services.phoneNumber
                ? [
                    services.phoneNumber.e164,
                    `Region ${services.phoneNumber.region}`,
                  ]
                : ["Not provisioned"]
            }
            status={services.phoneNumber?.status}
          />
        </div>
      )}

      <AddDomainModal
        open={domainModal}
        onClose={() => setDomainModal(false)}
        projectId={projectId}
        onAdded={() => {
          setDomainModal(false);
          void load();
          setToast("Domain attached — publish the CNAME to finish.");
          window.setTimeout(() => setToast(null), 4000);
        }}
      />

      <AddEnvModal
        open={envModal}
        onClose={() => setEnvModal(false)}
        projectId={projectId}
        onAdded={() => {
          setEnvModal(false);
          void load();
          setToast("Variable saved.");
          window.setTimeout(() => setToast(null), 3000);
        }}
      />

      <TroubleshootModal
        result={troubleshootResult}
        aiInfo={aiInfo}
        onClose={() => setTroubleshootResult(null)}
      />

      <BuyDomainModal
        open={buyModal}
        onClose={() => setBuyModal(false)}
        projectId={projectId}
        onBought={(hostname) => {
          setBuyModal(false);
          void load();
          setToast(`Registered ${hostname} — attached to this project.`);
          window.setTimeout(() => setToast(null), 4500);
        }}
      />

      <ConnectGitModal
        open={gitModal}
        onClose={() => setGitModal(false)}
        projectId={projectId}
        onConnected={() => {
          setGitModal(false);
          void load();
          setToast("Git repository connected.");
          window.setTimeout(() => setToast(null), 3500);
        }}
      />

      <ScaleModal
        open={scaleModal}
        onClose={() => setScaleModal(false)}
        projectId={projectId}
        initial={{
          vcpu: project.vcpu,
          memoryMb: project.memoryMb,
          diskGb: project.diskGb,
          alwaysOn: project.alwaysOn,
          desiredInstances: project.desiredInstances,
          minInstances: project.minInstances,
          maxInstances: project.maxInstances,
        }}
        onScaled={() => {
          setScaleModal(false);
          void load();
          setToast("Resized.");
          window.setTimeout(() => setToast(null), 3500);
        }}
      />
    </div>
  );
}

/* ---------- small bits ---------- */

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-[88px] border-r border-border last:border-r-0 px-3 first:pl-0">
      <div className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-ink">{value}</div>
    </div>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  body,
  status,
  action,
}: {
  icon: typeof Globe;
  title: string;
  body: string[];
  status?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel space-y-2 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-ember">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="font-display text-sm font-semibold text-ink">
          {title}
        </span>
        {status && (
          <span
            className={cx(
              "ml-auto rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
              status === "active"
                ? "bg-live/15 text-live"
                : "bg-warn/15 text-warn",
            )}
          >
            {status}
          </span>
        )}
      </div>
      {body.map((line, i) => (
        <p
          key={i}
          className="break-all font-mono text-2xs text-ink-dim"
          title={line}
        >
          {line}
        </p>
      ))}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

function DeployStatusBadge({ status }: { status: string }) {
  const tone =
    status === "live"
      ? "bg-live/15 text-live"
      : status === "failed"
        ? "bg-down/20 text-down"
        : status === "building" || status === "queued"
          ? "bg-warn/15 text-warn"
          : "bg-surface-3 text-ink-faint";
  return (
    <span className={cx("rounded px-1.5 py-0.5 font-mono text-[0.6rem]", tone)}>
      {status}
    </span>
  );
}

function shortHash(): string {
  return Array.from({ length: 7 }, () =>
    "0123456789abcdef".charAt(Math.floor(Math.random() * 16)),
  ).join("");
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diffMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/* ---------- modals ---------- */

function AddDomainModal({
  open,
  onClose,
  projectId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onAdded: () => void;
}) {
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    type: string;
    name: string;
    value: string;
  } | null>(null);

  async function submit() {
    const host = hostname.trim();
    if (!host || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.addDomain(projectId, host);
      setResult(res.dns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  function done() {
    setHostname("");
    setError(null);
    setResult(null);
    onAdded();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Attach domain"
      description="Cantila will issue SSL once the DNS record points at the platform."
      footer={
        result ? (
          <Button variant="primary" onClick={done}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy || !hostname.trim()}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Attach
            </Button>
          </>
        )
      }
    >
      {!result && (
        <>
          <Field label="Hostname">
            <input
              autoFocus
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="www.example.com"
              className={inputClass}
            />
          </Field>
          {error && (
            <p className="text-2xs text-down">{error}</p>
          )}
        </>
      )}
      {result && (
        <div className="space-y-2">
          <p className="text-2xs text-ink-dim">
            Add this DNS record at your registrar:
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-2xs">
            <span className="text-ember">{result.type}</span>
            <span className="text-ink">{result.name}</span>
            <span className="text-ink-faint">→</span>
            <span className="text-ink">{result.value}</span>
            <CopyButton value={`${result.type} ${result.name} ${result.value}`} />
          </div>
          <p className="text-2xs text-ink-faint">
            SSL will activate automatically once the record propagates.
          </p>
        </div>
      )}
    </Modal>
  );
}

function AddEnvModal({
  open,
  onClose,
  projectId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onAdded: () => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(true);
  const [scope, setScope] = useState<"production" | "preview" | "all">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!key.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.setEnv(projectId, {
        key: key.trim(),
        value,
        secret,
        scope,
      });
      setKey("");
      setValue("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add environment variable"
      description="Stored on the project. Secrets are masked in logs."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy || !key.trim()}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </>
      }
    >
      <Field label="Key">
        <input
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="STRIPE_API_KEY"
          className={inputClass}
        />
      </Field>
      <Field label="Value">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk_live_…"
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Scope">
          <select
            value={scope}
            onChange={(e) =>
              setScope(e.target.value as "production" | "preview" | "all")
            }
            className={inputClass}
          >
            <option value="all">all</option>
            <option value="production">production</option>
            <option value="preview">preview</option>
          </select>
        </Field>
        <Field label="Secret">
          <select
            value={secret ? "yes" : "no"}
            onChange={(e) => setSecret(e.target.value === "yes")}
            className={inputClass}
          >
            <option value="yes">yes — mask in logs</option>
            <option value="no">no — plain text</option>
          </select>
        </Field>
      </div>
      {error && <p className="text-2xs text-down">{error}</p>}
    </Modal>
  );
}

function TroubleshootModal({
  result,
  aiInfo,
  onClose,
}: {
  result: ApiTroubleshootResult | null;
  aiInfo: { label: string; live: boolean } | null;
  onClose: () => void;
}) {
  // Surface which analyser produced these suggestions. `live: false` is
  // the rule-based stub or a Claude adapter that fell back; the operator
  // sees the label and can interpret the suggestion quality accordingly.
  const adapterBadge = aiInfo
    ? aiInfo.live
      ? `via ${aiInfo.label}`
      : `via ${aiInfo.label} (stub)`
    : null;
  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title="AI troubleshooting"
      description={
        result
          ? `Deployment ${result.deploymentId.slice(0, 16)}… · ${result.failed ? "failed" : "healthy"}${result.lastStep ? ` · last step ${result.lastStep}` : ""}${adapterBadge ? ` · ${adapterBadge}` : ""}`
          : ""
      }
      footer={
        <Button variant="primary" onClick={onClose}>
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          Got it
        </Button>
      }
    >
      {result && (
        <>
          <div className="space-y-3">
            {result.suggestions.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-border-soft bg-surface-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      s.confidence === "high"
                        ? "bg-ember/15 text-ember"
                        : s.confidence === "medium"
                          ? "bg-warn/15 text-warn"
                          : "bg-surface-3 text-ink-faint",
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span className="font-display text-sm font-semibold text-ink">
                    {s.title}
                  </span>
                  <span
                    className={cx(
                      "ml-auto rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                      s.confidence === "high"
                        ? "bg-ember/15 text-ember"
                        : s.confidence === "medium"
                          ? "bg-warn/15 text-warn"
                          : "bg-surface-3 text-ink-faint",
                    )}
                  >
                    {s.confidence}
                  </span>
                </div>
                <p className="mt-2 text-2xs leading-relaxed text-ink-dim">
                  {s.body}
                </p>
                {s.actions && s.actions.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {s.actions.map((a, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-2 rounded border border-border bg-bg px-2 py-1.5"
                      >
                        <span className="rounded bg-ember/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-ember">
                          {a.label}
                        </span>
                        <code className="break-all font-mono text-2xs text-ink-dim">
                          {a.hint}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {result.excerpt.length > 0 && (
            <div>
              <p className="kv mb-1.5 text-ink-faint">Step trace</p>
              <div className="space-y-0.5 rounded border border-border-soft bg-[#0a0b0d] px-3 py-2 font-mono text-2xs text-ink-faint">
                {result.excerpt.map((l, i) => (
                  <div key={i}>
                    <span className="text-ember">▸</span> {l}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function BuyDomainModal({
  open,
  onClose,
  projectId,
  onBought,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onBought: (hostname: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      hostname: string;
      tld: string;
      available: boolean;
      pricePerYearCents: number;
      pricePerYearDisplay: string;
    }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [years, setYears] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError(null);
      setYears(1);
    }
  }, [open]);

  async function runSearch() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const { results: live } = await api.searchDomains(
        q,
        "com,dev,io,app,ai,co,shop,xyz,build,net,org,store",
      );
      setResults(live);
    } catch (e) {
      setError(e instanceof Error ? e.message : "search failed");
    } finally {
      setSearching(false);
    }
  }

  async function buy(hostname: string) {
    setBuying(hostname);
    setError(null);
    try {
      const result = await api.registerDomain({
        hostname,
        years,
        projectId,
      });
      onBought(result.registration.hostname);
    } catch (e) {
      setError(e instanceof Error ? e.message : "purchase failed");
    } finally {
      setBuying(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buy a domain for this project"
      description="Search Cantila Domains. The DNS, SSL and email records get wired up automatically."
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
          placeholder="yourbrand"
          className={inputClass}
        />
        <Button
          variant="primary"
          onClick={runSearch}
          disabled={searching || !query.trim()}
        >
          {searching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          Search
        </Button>
      </div>

      <div className="flex items-center gap-2 text-2xs text-ink-faint">
        <span>Registration length</span>
        <select
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          className="h-7 rounded border border-border bg-bg px-2 text-2xs text-ink"
        >
          {[1, 2, 3, 5, 10].map((y) => (
            <option key={y} value={y}>
              {y} year{y > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      {results.length > 0 && (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {results.map((r) => (
            <div
              key={r.hostname}
              className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2"
            >
              <Globe
                className={cx(
                  "h-3.5 w-3.5 shrink-0",
                  r.available ? "text-live" : "text-ink-faint",
                )}
              />
              <code className="flex-1 font-mono text-xs text-ink">
                {r.hostname}
              </code>
              <span className="font-mono text-2xs text-ink-dim">
                {r.pricePerYearDisplay}/yr
                {years > 1 && (
                  <span className="text-ink-faint">
                    {" "}· total ${" "}
                    {((r.pricePerYearCents * years) / 100).toFixed(2)}
                  </span>
                )}
              </span>
              {r.available ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={buying === r.hostname}
                  onClick={() => buy(r.hostname)}
                >
                  {buying === r.hostname ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-3 w-3" strokeWidth={2.4} />
                  )}
                  Buy & attach
                </Button>
              ) : (
                <span className="text-2xs text-ink-faint">taken</span>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-2xs text-down">{error}</p>}
    </Modal>
  );
}

function ConnectGitModal({
  open,
  onClose,
  projectId,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onConnected: () => void;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One-time webhook-secret reveal: when set, the modal's form is replaced
  // with a copy-the-secret panel. Closing it dismisses the modal.
  const [reveal, setReveal] = useState<
    { webhookSecret: string; webhookUrl: string } | null
  >(null);

  async function submit() {
    const url = repoUrl.trim();
    if (!url || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.connectGit(projectId, {
        repoUrl: url,
        branch,
        autoDeploy,
      });
      setReveal({
        webhookSecret: result.webhookSecret,
        webhookUrl: result.webhookUrl,
      });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  function dismissReveal() {
    setReveal(null);
    setRepoUrl("");
    onClose();
  }

  if (reveal) {
    return (
      <Modal
        open={open}
        onClose={dismissReveal}
        title="Repository connected"
        description="Copy the webhook secret now — it is shown exactly once. Paste it into the git host's webhook config so Cantila can verify every push."
        footer={
          <Button variant="primary" onClick={dismissReveal}>
            <KeyRound className="h-4 w-4" strokeWidth={2.4} />
            I have it
          </Button>
        }
      >
        <Field label="Webhook URL">
          <CopyField value={reveal.webhookUrl} />
        </Field>
        <Field
          label="Webhook secret (one-time reveal)"
          hint="HMAC-SHA256 the request body with this; send as X-Hub-Signature-256: sha256=<hex>."
        >
          <CopyField value={reveal.webhookSecret} />
        </Field>
        <p className="text-2xs text-ink-faint">
          Lost it? Rotate with{" "}
          <code className="font-mono">cantila git rotate-secret {projectId}</code>{" "}
          — the previous secret stops working immediately.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a repository"
      description="Pushes to the chosen branch will auto-deploy this project."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={busy || !repoUrl.trim()}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Connect
          </Button>
        </>
      }
    >
      <Field label="Repository URL">
        <input
          autoFocus
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Branch">
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            className={inputClass}
          />
        </Field>
        <Field label="Auto-deploy">
          <select
            value={autoDeploy ? "on" : "off"}
            onChange={(e) => setAutoDeploy(e.target.value === "on")}
            className={inputClass}
          >
            <option value="on">on — deploy on push</option>
            <option value="off">off — manual deploys only</option>
          </select>
        </Field>
      </div>
      {error && <p className="text-2xs text-down">{error}</p>}
    </Modal>
  );
}

function ScaleModal({
  open,
  onClose,
  projectId,
  initial,
  onScaled,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  initial: {
    vcpu: number;
    memoryMb: number;
    diskGb: number;
    alwaysOn: boolean;
    desiredInstances: number;
    minInstances: number;
    maxInstances: number;
  };
  onScaled: () => void;
}) {
  const [vcpu, setVcpu] = useState(initial.vcpu);
  const [memoryMb, setMemoryMb] = useState(initial.memoryMb);
  const [diskGb, setDiskGb] = useState(initial.diskGb);
  const [alwaysOn, setAlwaysOn] = useState(initial.alwaysOn);
  const [desired, setDesired] = useState(initial.desiredInstances);
  const [minInst, setMinInst] = useState(initial.minInstances);
  const [maxInst, setMaxInst] = useState(initial.maxInstances);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVcpu(initial.vcpu);
      setMemoryMb(initial.memoryMb);
      setDiskGb(initial.diskGb);
      setAlwaysOn(initial.alwaysOn);
      setDesired(initial.desiredInstances);
      setMinInst(initial.minInstances);
      setMaxInst(initial.maxInstances);
      setError(null);
    }
  }, [
    open,
    initial.vcpu,
    initial.memoryMb,
    initial.diskGb,
    initial.alwaysOn,
    initial.desiredInstances,
    initial.minInstances,
    initial.maxInstances,
  ]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.scale(projectId, {
        vcpu,
        memoryMb,
        diskGb,
        alwaysOn,
        desiredInstances: desired,
        minInstances: minInst,
        maxInstances: maxInst,
      });
      onScaled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resize project"
      description="Vertical limits (CPU / RAM / disk) apply on the next deploy. Instance counts hit the load balancer immediately."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Apply
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label="vCPU">
          <input
            type="number"
            min={1}
            max={32}
            value={vcpu}
            onChange={(e) => setVcpu(Math.max(1, Number(e.target.value)))}
            className={inputClass}
          />
        </Field>
        <Field label="Memory (MB)">
          <input
            type="number"
            min={256}
            step={256}
            value={memoryMb}
            onChange={(e) => setMemoryMb(Math.max(256, Number(e.target.value)))}
            className={inputClass}
          />
        </Field>
        <Field label="Disk (GB)">
          <input
            type="number"
            min={1}
            value={diskGb}
            onChange={(e) => setDiskGb(Math.max(1, Number(e.target.value)))}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Mode">
        <select
          value={alwaysOn ? "on" : "sleep"}
          onChange={(e) => setAlwaysOn(e.target.value === "on")}
          className={inputClass}
        >
          <option value="sleep">Auto-sleep on idle</option>
          <option value="on">Pinned always-on</option>
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Instances">
          <input
            type="number"
            min={1}
            max={32}
            value={desired}
            onChange={(e) =>
              setDesired(Math.max(1, Math.min(32, Number(e.target.value))))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Min">
          <input
            type="number"
            min={1}
            max={32}
            value={minInst}
            onChange={(e) =>
              setMinInst(Math.max(1, Math.min(32, Number(e.target.value))))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Max">
          <input
            type="number"
            min={1}
            max={32}
            value={maxInst}
            onChange={(e) =>
              setMaxInst(Math.max(1, Math.min(32, Number(e.target.value))))
            }
            className={inputClass}
          />
        </Field>
      </div>
      <p className="text-2xs text-ink-faint">
        Desired is clamped into [min, max] server-side. Set min=max to pin a
        fixed instance count.
      </p>
      {error && <p className="text-2xs text-down">{error}</p>}
    </Modal>
  );
}

/* ============================================================
   Previews tab — branch preview environments (plan §5.1).
   ============================================================ */

function PreviewsPanel({
  projectId,
  onToast,
}: {
  projectId: string;
  onToast: (msg: string) => void;
}) {
  const [previews, setPreviews] = useState<ApiDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState("");
  const [creating, setCreating] = useState(false);
  const [destroying, setDestroying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { previews: list } = await api.listPreviews(projectId);
      setPreviews(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const value = branch.trim();
    if (!value || creating) return;
    setCreating(true);
    try {
      const result = await api.deployPreview(projectId, value);
      onToast(
        result.status === "live"
          ? `Preview live: ${result.url}`
          : `Preview failed`,
      );
      setBranch("");
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "preview deploy failed");
    } finally {
      setCreating(false);
    }
  }

  async function destroy(deploymentId: string, branchName?: string) {
    setDestroying(deploymentId);
    try {
      await api.destroyPreview(projectId, deploymentId);
      onToast(`Destroyed preview ${branchName ?? deploymentId}`);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "destroy failed");
    } finally {
      setDestroying(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="kv mb-1.5 block">Spin up a preview</label>
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
            placeholder="feature/x"
            className={inputClass}
          />
          <p className="mt-1.5 text-2xs text-ink-faint">
            Lives at <code className="font-mono">{`{slug}-{branch}.cantila.app`}</code> · production URL is untouched.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={create}
          disabled={!branch.trim() || creating}
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          Deploy preview
        </Button>
      </div>

      {error && (
        <div className="panel border-down/30 bg-down/5 px-4 py-3 text-2xs text-down">
          {error}
        </div>
      )}

      <div className="panel overflow-hidden p-0">
        {loading ? (
          <div className="px-5 py-10 text-center text-2xs text-ink-faint">
            Loading previews…
          </div>
        ) : previews.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-faint">
            No live previews. Push a non-tracked branch (or use the form above)
            to spin one up.
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {previews.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3.5 px-5 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ember">
                  <GitBranch className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {p.previewBranch}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-mono text-2xs text-ember hover:underline"
                    >
                      {p.url}
                    </a>
                  )}
                  <div className="font-mono text-[0.65rem] text-ink-faint">
                    {p.id}
                    {p.commitHash && ` · ${p.commitHash.slice(0, 7)}`}
                  </div>
                </div>
                <button
                  onClick={() => destroy(p.id, p.previewBranch)}
                  disabled={destroying === p.id}
                  className="flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-2xs font-medium text-ink-dim hover:border-down/40 hover:text-down disabled:opacity-50"
                >
                  {destroying === p.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Unlink className="h-3 w-3" />
                  )}
                  Destroy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Backups tab — point-in-time project snapshots (plan §5.5).
   ============================================================ */

function BackupsPanel({
  projectId,
  onToast,
  onRestored,
}: {
  projectId: string;
  onToast: (msg: string) => void;
  /** Fired after a successful restore so the parent re-loads the project
   *  detail (env tab + deployments tab show fresh values). */
  onRestored: () => void;
}) {
  const [backups, setBackups] = useState<ApiBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  // Restore is destructive — gate behind a confirm.
  const [confirmRestore, setConfirmRestore] = useState<ApiBackup | null>(null);

  const load = useCallback(async () => {
    try {
      const { backups: list } = await api.listBackups(projectId);
      setBackups(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const trimmed = note.trim();
      const backup = await api.createBackup(
        projectId,
        trimmed.length > 0 ? trimmed : undefined,
      );
      onToast(
        `Backup ${backup.id} captured (${backup.envVars.length} env vars)`,
      );
      setNote("");
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "backup failed");
    } finally {
      setCreating(false);
    }
  }

  async function restore(backup: ApiBackup) {
    setConfirmRestore(null);
    setRestoring(backup.id);
    try {
      const result = await api.restoreBackup(projectId, backup.id);
      onToast(
        result.status === "live"
          ? `Restored — new deployment ${result.id}`
          : `Restore deployed but ended in ${result.status}`,
      );
      onRestored();
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "restore failed");
    } finally {
      setRestoring(null);
    }
  }

  async function drop(backup: ApiBackup) {
    setDeleting(backup.id);
    try {
      await api.deleteBackup(projectId, backup.id);
      onToast(`Deleted backup ${backup.id}`);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="kv mb-1.5 block">Take a backup</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
            placeholder="Optional note (e.g. pre-migration checkpoint)"
            className={inputClass}
          />
          <p className="mt-1.5 text-2xs text-ink-faint">
            Captures the current live deployment + every env var. Restore re-applies both and rolls back the deployment.
          </p>
        </div>
        <Button variant="primary" onClick={create} disabled={creating}>
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Archive className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          Backup now
        </Button>
      </div>

      {error && (
        <div className="panel border-down/30 bg-down/5 px-4 py-3 text-2xs text-down">
          {error}
        </div>
      )}

      <div className="panel overflow-hidden p-0">
        {loading ? (
          <div className="px-5 py-10 text-center text-2xs text-ink-faint">
            Loading backups…
          </div>
        ) : backups.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-faint">
            No backups yet. Take one before any risky change — restore brings
            both deployment and env vars back exactly as they were.
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {backups.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3.5 px-5 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                  <Archive className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-ink">{b.id}</span>
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">
                      {b.trigger}
                    </span>
                  </div>
                  {b.note && (
                    <div className="truncate text-2xs text-ink-dim">{b.note}</div>
                  )}
                  <div className="font-mono text-[0.65rem] text-ink-faint">
                    deployment {b.deploymentId} · {b.envVars.length} env vars
                    {b.databaseSnapshotId && ` · db ${b.databaseSnapshotId}`} ·{" "}
                    {new Date(b.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmRestore(b)}
                  disabled={restoring === b.id}
                  className="flex h-8 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink hover:border-ember/40 hover:text-ember disabled:opacity-50"
                >
                  {restoring === b.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </button>
                <button
                  onClick={() => drop(b)}
                  disabled={deleting === b.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint hover:border-down/40 hover:text-down disabled:opacity-50"
                  aria-label="Delete backup"
                >
                  {deleting === b.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={confirmRestore !== null}
        onClose={() => setConfirmRestore(null)}
        title="Restore from backup?"
        description="This will overwrite every env var on the project AND roll the live deployment back to the captured one. The current deployment becomes superseded — but a backup of the new state isn't taken first."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => confirmRestore && void restore(confirmRestore)}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.4} />
              Restore
            </Button>
          </>
        }
      >
        {confirmRestore && (
          <div className="rounded-lg border border-border bg-surface-2 p-3 text-2xs text-ink-dim">
            <div className="font-mono">id: {confirmRestore.id}</div>
            <div className="font-mono">deployment: {confirmRestore.deploymentId}</div>
            <div className="font-mono">
              env vars: {confirmRestore.envVars.length}
            </div>
            {confirmRestore.note && (
              <div className="mt-1">note: {confirmRestore.note}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
