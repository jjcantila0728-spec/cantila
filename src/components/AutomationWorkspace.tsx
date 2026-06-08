"use client";

/* ============================================================
   AutomationWorkspace — embeds the native n8n or OpenClaw UI
   in an iframe. Each automation instance has its own dedicated
   workspace container; the workspace URL is returned by the
   control plane once provisioning completes.
   ============================================================ */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PageHeader, Pill, StatusBadge, cx } from "@/components/ui";
import { api, type ApiAutomation } from "@/lib/api";

interface Props {
  automationId: string;
}

export default function AutomationWorkspace({ automationId }: Props) {
  const [automation, setAutomation] = useState<ApiAutomation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const { automation: a } = await api.getAutomation(automationId);
      setAutomation(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [automationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-2xs text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        loading workspace…
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="space-y-4">
        <Link
          href="/automations"
          className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error ?? "automation not found"}
        </div>
      </div>
    );
  }

  const isN8n = automation.kind === "n8n";
  const backHref = isN8n ? "/n8n" : "/openclaw";
  const kindLabel = isN8n ? "n8n" : "OpenClaw";
  const workspaceUrl = automation.workspaceUrl;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* slim header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>
          <span className="text-border-soft">·</span>
          <span className="font-display text-sm font-semibold text-ink">
            {automation.name}
          </span>
          <StatusBadge status={automation.status} />
          <Pill tone={isN8n ? "ember" : "violet"}>{kindLabel}</Pill>
          <Pill tone="neutral">{automation.region}</Pill>
        </div>

        <div className="flex items-center gap-2">
          {workspaceUrl && (
            <>
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                title="Reload workspace"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink-dim hover:border-ember/40 hover:text-ember"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
              </button>
              <a
                href={workspaceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink-dim hover:border-ember/40 hover:text-ember"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in new tab
              </a>
            </>
          )}
        </div>
      </div>

      {/* workspace body */}
      {!workspaceUrl ? (
        <ProvisioningState kindLabel={kindLabel} adminUser={automation.workspaceAdminUser} />
      ) : (
        <iframe
          key={iframeKey}
          src={workspaceUrl}
          title={`${kindLabel} workspace — ${automation.name}`}
          className="min-h-0 flex-1 rounded-xl border border-border bg-surface"
          style={{ height: "calc(100vh - 10rem)" }}
          allow="clipboard-write"
        />
      )}
    </div>
  );
}

function ProvisioningState({
  kindLabel,
  adminUser,
}: {
  kindLabel: string;
  adminUser?: string;
}) {
  return (
    <div className="panel dot-grid flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember/10 text-ember">
        <Loader2 className="h-5 w-5 animate-spin" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">
          Provisioning {kindLabel} workspace…
        </p>
        <p className="mt-1 text-2xs text-ink-faint">
          Your dedicated {kindLabel} container is starting up. This usually
          takes under a minute. Refresh the page once it&apos;s live.
        </p>
        {adminUser && (
          <p className="mt-2 font-mono text-2xs text-ink-faint">
            admin user: <span className="text-ink">{adminUser}</span>
          </p>
        )}
      </div>
    </div>
  );
}
