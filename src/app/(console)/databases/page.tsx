import Link from "next/link";
import { Plus, MapPin, ShieldCheck, Link2, HardDrive } from "lucide-react";
import { PageHeader, StatusBadge, Meter, Pill, cx } from "@/components/ui";
import { databases, getProject, REGIONS } from "@/lib/mock-data";
import type { Database, DbEngine } from "@/lib/types";

export const metadata = { title: "Databases · Cantila Console" };

const ENGINE: Record<
  DbEngine,
  { mark: string; tone: string; label: string }
> = {
  postgres: { mark: "Pg", tone: "text-violet bg-violet/10 border-violet/25", label: "PostgreSQL" },
  mysql: { mark: "My", tone: "text-info bg-info/10 border-info/25", label: "MySQL" },
  mongodb: { mark: "Mo", tone: "text-live bg-live/10 border-live/25", label: "MongoDB" },
  redis: { mark: "Re", tone: "text-down bg-down/10 border-down/25", label: "Redis" },
};

function DbCard({ db }: { db: Database }) {
  const e = ENGINE[db.engine];
  const project = getProject(db.linkedProjectId ?? "");
  const pct = (db.usedGb / db.sizeGb) * 100;

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-bold",
            e.tone,
          )}
        >
          {e.mark}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink">
            {db.name}
          </h3>
          <p className="font-mono text-2xs text-ink-faint">
            {e.label} {db.version}
          </p>
        </div>
        <StatusBadge status={db.status} />
      </div>

      {/* storage */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-2xs">
          <span className="inline-flex items-center gap-1 text-ink-faint">
            <HardDrive className="h-3 w-3" />
            Storage
          </span>
          <span className="font-mono text-ink-dim">
            {db.usedGb} / {db.sizeGb} GB
          </span>
        </div>
        <Meter value={pct} tone={pct > 80 ? "warn" : "violet"} />
      </div>

      {/* linked project */}
      <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
        <Link2 className="h-3.5 w-3.5 text-ink-faint" />
        {project ? (
          <Link
            href={`/projects/${project.id}`}
            className="font-mono text-xs text-ink-dim hover:text-ember"
          >
            {project.name}
          </Link>
        ) : (
          <span className="font-mono text-xs text-ink-faint">Unlinked</span>
        )}
        <span className="ml-auto">
          <Pill tone="neutral">{db.plan}</Pill>
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3 text-2xs text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {REGIONS[db.region].city}
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-live" />
          Backups {db.backupsAt}
        </span>
      </div>
    </div>
  );
}

export default function DatabasesPage() {
  const totalUsed = databases.reduce((s, d) => s + d.usedGb, 0);
  const totalSize = databases.reduce((s, d) => s + d.sizeGb, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cantila Data"
        title="Databases"
        lead="Managed PostgreSQL, MySQL, MongoDB and Redis — each on a private network with automated daily backups."
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            New database
          </button>
        }
      />

      {/* rollup */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Databases", v: String(databases.length) },
          { k: "Storage used", v: `${totalUsed.toFixed(1)} GB` },
          { k: "Allocated", v: `${totalSize} GB` },
          { k: "Backups", v: "Daily · 03:00" },
        ].map((s) => (
          <div key={s.k} className="panel p-4">
            <div className="kv">{s.k}</div>
            <div className="mt-1.5 font-mono text-lg font-semibold text-ink">
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 stagger md:grid-cols-2 xl:grid-cols-3">
        {databases.map((db) => (
          <DbCard key={db.id} db={db} />
        ))}
      </div>
    </div>
  );
}
