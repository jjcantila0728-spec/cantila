"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  ShieldCheck,
  Link2,
  HardDrive,
  Search,
  Box,
  Zap,
  Loader2,
} from "lucide-react";
import { PageHeader, StatusBadge, Meter, Pill, Button, cx } from "@/components/ui";
import Modal, { Field, inputClass } from "@/components/Modal";
import {
  databases,
  storageBuckets,
  projects,
  getProject,
  REGIONS,
} from "@/lib/mock-data";
import type { Database, DbEngine, Region, StorageBucket } from "@/lib/types";
import { api, isControlPlaneLive } from "@/lib/api";

const ENGINE: Record<DbEngine, { mark: string; tone: string; label: string }> = {
  postgres: { mark: "Pg", tone: "text-violet bg-violet/10 border-violet/25", label: "PostgreSQL" },
  mysql: { mark: "My", tone: "text-info bg-info/10 border-info/25", label: "MySQL" },
  mongodb: { mark: "Mo", tone: "text-live bg-live/10 border-live/25", label: "MongoDB" },
  redis: { mark: "Re", tone: "text-down bg-down/10 border-down/25", label: "Redis" },
};

const ENGINES: DbEngine[] = ["postgres", "mysql", "mongodb", "redis"];
const ENGINE_VERSION: Record<DbEngine, string> = {
  postgres: "16.3",
  mysql: "8.4",
  mongodb: "7.0",
  redis: "7.4",
};
const PLANS = ["Micro", "Standard", "Pro"];
const PLAN_SIZE: Record<string, number> = { Micro: 1, Standard: 10, Pro: 25 };

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "db"
  );
}

function DbCard({ db }: { db: Database }) {
  const e = ENGINE[db.engine];
  const project = getProject(db.linkedProjectId ?? "");
  const pct = db.sizeGb > 0 ? (db.usedGb / db.sizeGb) * 100 : 0;

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

function BucketCard({ bucket }: { bucket: StorageBucket }) {
  const project = getProject(bucket.linkedProjectId ?? "");

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-info/25 bg-info/10 text-info">
          <Box className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink">
            {bucket.name}
          </h3>
          <p className="font-mono text-2xs text-ink-faint">
            S3-compatible bucket
          </p>
        </div>
        <Pill tone={bucket.visibility === "public" ? "warn" : "neutral"}>
          {bucket.visibility === "public" ? "Public" : "Private"}
        </Pill>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
          <div className="kv">Objects</div>
          <div className="mt-1 font-mono text-sm font-semibold text-ink">
            {bucket.objects.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
          <div className="kv">Size</div>
          <div className="mt-1 font-mono text-sm font-semibold text-ink">
            {bucket.sizeGb} GB
          </div>
        </div>
      </div>

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
        {bucket.cdn && (
          <span className="ml-auto">
            <Pill tone="ember">
              <Zap className="h-3 w-3" />
              CDN
            </Pill>
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3 text-2xs text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {REGIONS[bucket.region].city}
        </span>
        <span>Created {bucket.createdAt}</span>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  engine: "postgres" as DbEngine,
  region: "fsn1" as Region,
  plan: "Standard",
  linkedProjectId: "",
};

const EMPTY_BUCKET = {
  name: "",
  region: "fsn1" as Region,
  visibility: "private" as "private" | "public",
  cdn: false,
  projectId: "",
};

type LiveBucket = StorageBucket & { liveId?: string };

export default function DatabasesView() {
  const [items, setItems] = useState<Database[]>(() => [...databases]);
  const [buckets, setBuckets] = useState<LiveBucket[]>(() => [
    ...storageBuckets,
  ]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bucketOpen, setBucketOpen] = useState(false);
  const [bucketForm, setBucketForm] = useState(EMPTY_BUCKET);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [liveProjects, setLiveProjects] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [busy, setBusy] = useState(false);

  /* Load live databases + buckets when the control plane is reachable. The
     live entries are prepended above the mock seed so the page never feels
     empty. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        const [{ databases: liveDbs }, { buckets: liveBuckets }, { projects: liveProjs }] =
          await Promise.all([
            api.listAccountDatabases(),
            api.listBuckets(),
            api.listProjects(),
          ]);
        if (cancelled) return;
        setLiveProjects(liveProjs.map((p) => ({ id: p.id, slug: p.slug, name: p.name })));
        const mapped: Database[] = liveDbs.map((d) => ({
          id: d.id,
          name: `${d.projectSlug}-${d.engine}`,
          engine: d.engine as DbEngine,
          version: d.version,
          status:
            d.status === "active" ? "healthy" : d.status === "sleeping" ? "sleeping" : "provisioning",
          region: d.region as Region,
          sizeGb: 10,
          usedGb: 0,
          plan: "Auto-wired",
          linkedProjectId: d.projectSlug,
          backupsAt: "03:00 daily",
        }));
        setItems((prev) => [
          ...mapped,
          ...prev.filter((db) => !mapped.find((m) => m.id === db.id)),
        ]);
        const liveB: LiveBucket[] = liveBuckets.map((b) => ({
          id: b.id,
          liveId: b.id,
          name: b.name,
          region: b.region as Region,
          visibility: b.publicRead ? "public" : "private",
          objects: b.objects,
          sizeGb: b.sizeGb,
          cdn: b.cdn,
          createdAt: "just now",
        }));
        setBuckets((prev) => [
          ...liveB,
          ...prev.filter((p) => !liveB.find((l) => l.name === p.name)),
        ]);
      } catch {
        /* swallow — keep mock seed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      ENGINE[d.engine].label.toLowerCase().includes(q),
  );

  const totalUsed = items.reduce((s, d) => s + d.usedGb, 0);
  const totalObjects = buckets.reduce((s, b) => s + b.objects, 0);
  const totalBucketGb = buckets.reduce((s, b) => s + b.sizeGb, 0);
  const totalData = totalUsed + totalBucketGb;

  function createDatabase() {
    const name = form.name.trim();
    if (!name) return;
    const db: Database = {
      id: `db-${slugify(name)}-${items.length}`,
      name,
      engine: form.engine,
      version: ENGINE_VERSION[form.engine],
      status: "provisioning",
      region: form.region,
      sizeGb: PLAN_SIZE[form.plan] ?? 10,
      usedGb: 0,
      plan: form.plan,
      linkedProjectId: form.linkedProjectId || undefined,
      backupsAt: "03:00 daily",
    };
    setItems((prev) => [db, ...prev]);
    setForm(EMPTY_FORM);
    setModalOpen(false);
    setQuery("");
  }

  async function createBucket() {
    const name = bucketForm.name.trim();
    if (!name) return;

    if (liveMode) {
      const projectId = bucketForm.projectId || liveProjects[0]?.id;
      if (!projectId) {
        // No live projects yet — refuse so we don't fall back to a half-mock create
        return;
      }
      setBusy(true);
      try {
        const created = await api.createBucket({
          projectId,
          name: slugify(name),
          publicRead: bucketForm.visibility === "public",
          cdn: bucketForm.cdn,
        });
        const display: LiveBucket = {
          id: created.id,
          liveId: created.id,
          name: created.name,
          region: created.region as Region,
          visibility: created.publicRead ? "public" : "private",
          objects: created.objects,
          sizeGb: created.sizeGb,
          cdn: created.cdn,
          createdAt: "just now",
        };
        setBuckets((prev) => [display, ...prev]);
      } finally {
        setBusy(false);
      }
    } else {
      const bucket: LiveBucket = {
        id: `buk-${slugify(name)}-${buckets.length}`,
        name: slugify(name),
        region: bucketForm.region,
        visibility: bucketForm.visibility,
        objects: 0,
        sizeGb: 0,
        cdn: bucketForm.cdn,
        createdAt: "just now",
      };
      setBuckets((prev) => [bucket, ...prev]);
    }
    setBucketForm(EMPTY_BUCKET);
    setBucketOpen(false);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Cantila Data · live" : "Cantila Data"}
        title="Databases & storage"
        lead="Managed databases and S3-compatible object storage — provisioned on Cantila's own data plane, on a private network with automated backups."
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
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New database
            </button>
          </div>
        }
      />

      {/* rollup */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Databases", v: String(items.length) },
          { k: "Storage buckets", v: String(buckets.length) },
          { k: "Objects", v: totalObjects.toLocaleString() },
          { k: "Data stored", v: `${totalData.toFixed(1)} GB` },
        ].map((s) => (
          <div key={s.k} className="panel p-4">
            <div className="kv">{s.k}</div>
            <div className="mt-1.5 font-mono text-lg font-semibold text-ink">
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* databases */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="kv text-ink-dim">Databases · {items.length}</h2>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 sm:w-64">
            <Search className="h-4 w-4 shrink-0 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search databases…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((db) => (
              <DbCard key={db.id} db={db} />
            ))}
          </div>
        ) : (
          <div className="panel dot-grid py-16 text-center text-sm text-ink-faint">
            No databases match “{query}”.
          </div>
        )}
      </section>

      {/* object storage */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="kv text-ink-dim">
            Object storage · {buckets.length}
          </h2>
          <button
            onClick={() => setBucketOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink transition-colors hover:border-ink-faint"
          >
            <Plus className="h-3.5 w-3.5" />
            New bucket
          </button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {buckets.map((b) => (
            <BucketCard key={b.id} bucket={b} />
          ))}
        </div>
      </section>

      {/* new database modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New database"
        description="Provision a managed database on a private network."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createDatabase}
              disabled={!form.name.trim()}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Provision
            </Button>
          </>
        }
      >
        <Field label="Name">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") createDatabase();
            }}
            placeholder="my-app-db"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Engine">
            <select
              value={form.engine}
              onChange={(e) =>
                setForm({ ...form, engine: e.target.value as DbEngine })
              }
              className={inputClass}
            >
              {ENGINES.map((eng) => (
                <option key={eng} value={eng}>
                  {ENGINE[eng].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan">
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className={inputClass}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p} — {PLAN_SIZE[p]} GB
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

        <Field label="Link to project" hint="Optional — attaches over the private network.">
          <select
            value={form.linkedProjectId}
            onChange={(e) =>
              setForm({ ...form, linkedProjectId: e.target.value })
            }
            className={inputClass}
          >
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* new bucket modal */}
      <Modal
        open={bucketOpen}
        onClose={() => setBucketOpen(false)}
        title="New storage bucket"
        description="Create an S3-compatible bucket on Cantila object storage."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBucketOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createBucket}
              disabled={
                !bucketForm.name.trim() ||
                busy ||
                (liveMode === true && liveProjects.length === 0)
              }
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.4} />
              )}
              Create bucket
            </Button>
          </>
        }
      >
        <Field label="Bucket name">
          <input
            autoFocus
            value={bucketForm.name}
            onChange={(e) =>
              setBucketForm({ ...bucketForm, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") void createBucket();
            }}
            placeholder="my-app-assets"
            className={inputClass}
          />
        </Field>

        {liveMode && (
          <Field label="Project" hint="Bucket lives inside this project's private network.">
            <select
              value={bucketForm.projectId}
              onChange={(e) =>
                setBucketForm({ ...bucketForm, projectId: e.target.value })
              }
              className={inputClass}
            >
              {liveProjects.length === 0 ? (
                <option value="">No live projects — create one first</option>
              ) : (
                <>
                  <option value="">Pick a project…</option>
                  {liveProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </>
              )}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Region">
            <select
              value={bucketForm.region}
              onChange={(e) =>
                setBucketForm({
                  ...bucketForm,
                  region: e.target.value as Region,
                })
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
          <Field label="Visibility">
            <select
              value={bucketForm.visibility}
              onChange={(e) =>
                setBucketForm({
                  ...bucketForm,
                  visibility: e.target.value as "private" | "public",
                })
              }
              className={inputClass}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={bucketForm.cdn}
            onChange={(e) =>
              setBucketForm({ ...bucketForm, cdn: e.target.checked })
            }
            className="h-4 w-4 rounded border-border bg-bg accent-ember"
          />
          <span className="text-sm text-ink">
            Enable Cantila CDN
            <span className="ml-1.5 text-2xs text-ink-faint">
              — global edge cache
            </span>
          </span>
        </label>
      </Modal>
    </div>
  );
}
