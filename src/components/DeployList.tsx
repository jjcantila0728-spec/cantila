/* ============================================================
   Cantila Console — deployment list
   Shared by the Dashboard and a project's Deployments tab.
   Presentational / server-safe.
   ============================================================ */

import Link from "next/link";
import {
  GitBranch,
  Sparkles,
  SquareTerminal,
  Plug,
  Upload,
  RotateCcw,
} from "lucide-react";
import type { Deployment, DeployTrigger } from "@/lib/types";
import { getProject } from "@/lib/mock-data";
import { StatusDot, statusTone, cx } from "./ui";

export const TRIGGER: Record<
  DeployTrigger,
  { icon: typeof GitBranch; label: string }
> = {
  chat: { icon: Sparkles, label: "Chat Deploy" },
  git: { icon: GitBranch, label: "Git push" },
  cli: { icon: SquareTerminal, label: "CLI" },
  mcp: { icon: Plug, label: "Claude · MCP" },
  upload: { icon: Upload, label: "Upload" },
};

function fmtDuration(s: number) {
  if (s === 0) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function DeployRow({
  d,
  showProject = false,
  detailed = false,
}: {
  d: Deployment;
  showProject?: boolean;
  detailed?: boolean;
}) {
  const trig = TRIGGER[d.trigger];
  const TrigIcon = trig.icon;
  const project = showProject ? getProject(d.projectId) : undefined;
  const tone = statusTone(d.status);

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
      <StatusDot status={d.status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {showProject && project && (
            <Link
              href={`/projects/${project.id}`}
              className="shrink-0 font-medium text-ink hover:text-ember"
            >
              {project.name}
            </Link>
          )}
          {showProject && <span className="text-ink-faint">/</span>}
          <span className="truncate text-sm text-ink">{d.commitMessage}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs text-ink-faint">
          <span className="font-mono text-ink-dim">{d.commitHash}</span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <TrigIcon className="h-3 w-3" />
            {trig.label}
          </span>
          <span className="text-border">·</span>
          <span className="font-mono">{d.branch}</span>
          {detailed && (
            <>
              <span className="text-border">·</span>
              <span>{d.author}</span>
            </>
          )}
        </div>
      </div>

      <div className="hidden text-right sm:block">
        <div className={cx("text-2xs font-medium", tone.text)}>
          {tone.label}
        </div>
        <div className="mt-1 font-mono text-2xs text-ink-faint">
          {fmtDuration(d.durationSec)} · {d.createdAt}
        </div>
      </div>

      {detailed &&
        (d.status === "superseded" || d.status === "rolled-back") && (
          <button className="hidden items-center gap-1 rounded-md border border-border px-2 py-1 text-2xs text-ink-dim opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 md:inline-flex">
            <RotateCcw className="h-3 w-3" />
            Rollback
          </button>
        )}
    </div>
  );
}

export default function DeployList({
  deployments,
  showProject = false,
  detailed = false,
}: {
  deployments: Deployment[];
  showProject?: boolean;
  detailed?: boolean;
}) {
  if (deployments.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-ink-faint">
        No deployments yet.
      </div>
    );
  }
  return (
    <div className="divide-y divide-border-soft">
      {deployments.map((d) => (
        <DeployRow
          key={d.id}
          d={d}
          showProject={showProject}
          detailed={detailed}
        />
      ))}
    </div>
  );
}
