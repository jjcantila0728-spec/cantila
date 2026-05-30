"use client";

import { useState } from "react";
import {
  ExternalLink,
  RotateCw,
  Database as DatabaseIcon,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { api, type ApiProjectDetail } from "../lib/api";
import { StatusBadge, Pill, cx } from "./ui";

export default function ProjectOverviewPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project, services, deployments, domains } = detail;
  const live = deployments.find((d) => d.status === "live") ?? deployments[0];
  const primary = domains.find((d) => d.primary) ?? domains[0];
  const liveUrl = primary ? `https://${primary.hostname}` : undefined;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function redeploy() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await api.deploy(project.id);
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "redeploy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        )}
        <button
          onClick={redeploy}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
        >
          <RotateCw className={cx("h-3.5 w-3.5", busy && "animate-spin")} />
          {busy ? "Deploying…" : "Redeploy"}
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-ink">
            Production deployment
          </h3>
          {live && <StatusBadge status={live.status} />}
        </div>
        {live ? (
          <>
            {live.commitMessage && (
              <p className="text-sm text-ink">{live.commitMessage}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-y-3">
              <Cell k="Commit" v={live.commitHash ?? "—"} mono />
              <Cell k="Branch" v={live.branch ?? "—"} mono />
              <Cell k="Trigger" v={live.trigger} />
              <Cell k="Runtime" v={live.runtime} />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-faint">No deployments yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">
          Linked services
        </h3>
        <div className="space-y-2.5">
          <ServiceRow
            icon={Globe}
            title={primary?.hostname ?? `${project.slug}.cantila.app`}
            sub={primary ? "Domain · SSL " + (primary.sslActive ? "active" : "issuing") : "Default subdomain"}
            tone="info"
          />
          {services.database && (
            <ServiceRow
              icon={DatabaseIcon}
              title={`${services.database.engine} ${services.database.version}`}
              sub={`Database · ${services.database.status}`}
              tone="violet"
            />
          )}
          {services.mailbox && (
            <ServiceRow
              icon={Mail}
              title={services.mailbox.address}
              sub={`Mailbox · ${services.mailbox.status}`}
              tone="info"
            />
          )}
          {services.phoneNumber && (
            <ServiceRow
              icon={Phone}
              title={services.phoneNumber.e164}
              sub={`Number · ${services.phoneNumber.status}`}
              tone="info"
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Pill tone={project.alwaysOn ? "live" : "neutral"}>
          {project.alwaysOn ? "Always-on" : "Scales to zero"}
        </Pill>
        <Pill tone="neutral">{`${project.vcpu} vCPU`}</Pill>
        <Pill tone="neutral">{`${project.memoryMb / 1024} GB`}</Pill>
        <Pill tone="neutral">{project.region}</Pill>
      </div>
    </div>
  );
}

function Cell({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="kv">{k}</div>
      <div className={cx("mt-0.5 text-sm text-ink", mono && "font-mono text-xs")}>
        {v}
      </div>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  title,
  sub,
  tone,
}: {
  icon: typeof Globe;
  title: string;
  sub: string;
  tone: "info" | "violet";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface px-3 py-2.5">
      <Icon className={cx("h-4 w-4", tone === "violet" ? "text-violet" : "text-info")} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-xs text-ink">{title}</div>
        <div className="text-2xs text-ink-faint">{sub}</div>
      </div>
    </div>
  );
}
