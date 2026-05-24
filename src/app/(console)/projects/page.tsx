import Link from "next/link";
import { Rocket, MapPin, Clock, ArrowUpRight, Cpu } from "lucide-react";
import { PageHeader, StatusBadge, RuntimeMark, cx } from "@/components/ui";
import { Sparkline } from "@/components/AreaChart";
import { projects, REGIONS } from "@/lib/mock-data";
import type { Project } from "@/lib/types";

export const metadata = { title: "Projects · Cantila Console" };

function ProjectCard({ p }: { p: Project }) {
  const cpuNow = Math.round(p.metrics.cpu[p.metrics.cpu.length - 1]);
  const dimmed = p.status === "sleeping" || p.status === "paused";

  return (
    <Link
      href={`/projects/${p.id}`}
      className={cx(
        "panel group flex flex-col gap-4 p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-lift",
      )}
    >
      <div className="flex items-start gap-3">
        <RuntimeMark runtime={p.runtime} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold text-ink">
              {p.name}
            </h3>
          </div>
          <p className="mt-0.5 font-mono text-2xs text-ink-faint">{p.type}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <p className={cx("text-sm leading-snug", dimmed ? "text-ink-faint" : "text-ink-dim")}>
        {p.description}
      </p>

      {/* sparkline strip */}
      <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
        <Cpu className="h-3.5 w-3.5 text-ink-faint" />
        <span className="font-mono text-2xs text-ink-faint">CPU</span>
        <span className="font-mono text-xs font-medium text-ink-dim">{cpuNow}%</span>
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
        <span className="inline-flex items-center gap-1 font-medium text-ink-dim opacity-0 transition-opacity group-hover:opacity-100">
          Open
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const counts = {
    all: projects.length,
    live: projects.filter((p) => p.status === "live").length,
    building: projects.filter((p) => p.status === "building").length,
    issues: projects.filter(
      (p) => p.status === "crashed" || p.status === "paused",
    ).length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workloads"
        title="Projects"
        lead="Every site, app, agent and worker running on the Cantila fleet."
        actions={
          <Link
            href="/deploy"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
          >
            <Rocket className="h-4 w-4" strokeWidth={2.4} />
            New project
          </Link>
        }
      />

      {/* filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { k: "All", n: counts.all, active: true },
          { k: "Live", n: counts.live, active: false },
          { k: "Building", n: counts.building, active: false },
          { k: "Needs attention", n: counts.issues, active: false },
        ].map((f) => (
          <button
            key={f.k}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
              f.active
                ? "bg-surface-3 text-ink ring-1 ring-border"
                : "text-ink-dim hover:bg-surface-2 hover:text-ink",
            )}
          >
            {f.k}
            <span
              className={cx(
                "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                f.active ? "bg-ember/15 text-ember" : "bg-surface-3 text-ink-faint",
              )}
            >
              {f.n}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 stagger md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
