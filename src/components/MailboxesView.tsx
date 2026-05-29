"use client";

/* ============================================================
   Cantila Mail — hosted mailboxes (plan §4.4).
   Lists, creates and deletes real inboxes (you@yourdomain.com)
   on the live control plane. Distinct from the transactional
   mailbox each project is auto-wired with on first deploy.

   Live-only: hosted mailboxes have no mock fixtures, so when the
   control plane is offline the view renders an explanatory empty
   state rather than seeded data.
   ============================================================ */

import { useEffect, useState } from "react";
import {
  Inbox,
  Plus,
  Trash2,
  Loader2,
  Zap,
  AlertCircle,
  Mail,
} from "lucide-react";
import { PageHeader, Pill, Button, cx } from "@/components/ui";
import Modal, { Field, inputClass } from "@/components/Modal";
import {
  api,
  isControlPlaneLive,
  type ApiHostedMailbox,
  type ApiProject,
} from "@/lib/api";
import { useIsOwner } from "@/lib/owner";

/** The seeded hidden Platform project that owns cantila.app
 *  (control-plane src/domain/seed-platform.ts). Keep in sync. */
const PLATFORM_PROJECT_ID = "proj_platform";

/* Storage-quota presets shown in the create form. */
const QUOTA_PRESETS = [
  { mb: 1024, label: "1 GB" },
  { mb: 5120, label: "5 GB" },
  { mb: 10240, label: "10 GB" },
  { mb: 25600, label: "25 GB" },
];

const EMPTY_FORM = {
  projectId: "",
  address: "",
  displayName: "",
  kind: "personal" as "personal" | "shared",
  quotaMb: 10240,
};

function formatMb(mb: number): string {
  return mb >= 1024
    ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
    : `${mb} MB`;
}

export default function MailboxesView() {
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [mailboxes, setMailboxes] = useState<ApiHostedMailbox[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = useIsOwner();
  const [mode, setMode] = useState<"platform" | "project">("project");
  const [oneTimePassword, setOneTimePassword] = useState<string | null>(null);
  const [createdAddress, setCreatedAddress] = useState<string | null>(null);

  async function load() {
    const [mbx, prj] = await Promise.all([
      api
        .listHostedMailboxes()
        .catch(() => ({ mailboxes: [] as ApiHostedMailbox[] })),
      api.listProjects().catch(() => ({ projects: [] as ApiProject[] })),
    ]);
    setMailboxes(mbx.mailboxes);
    setProjects(prj.projects);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (ok) await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? id;

  function openCreate() {
    setError(null);
    setOneTimePassword(null);
    setCreatedAddress(null);
    setMode(isOwner ? "platform" : "project");
    setForm({ ...EMPTY_FORM, projectId: projects[0]?.id ?? "" });
    setModalOpen(true);
  }

  // Owner-only: create a real cantila.app mailbox on the hidden Platform
  // project. Returns a one-time password we show once and never store.
  async function createPlatformMailbox(localPart: string) {
    const local = localPart.trim().toLowerCase();
    if (!local || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.createHostedMailbox(PLATFORM_PROJECT_ID, {
        address: `${local}@cantila.app`,
        displayName: form.displayName.trim() || undefined,
        kind: form.kind,
        quotaMb: form.quotaMb,
      });
      if (res.oneTimePassword) {
        setOneTimePassword(res.oneTimePassword);
        setCreatedAddress(`${local}@cantila.app`);
      } else {
        setModalOpen(false);
        setForm(EMPTY_FORM);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create mailbox");
    } finally {
      setCreating(false);
    }
  }

  async function createMailbox() {
    const address = form.address.trim();
    if (!address || !form.projectId || creating) return;
    setCreating(true);
    setError(null);
    try {
      await api.createHostedMailbox(form.projectId, {
        address,
        displayName: form.displayName.trim() || undefined,
        kind: form.kind,
        quotaMb: form.quotaMb,
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create mailbox",
      );
    } finally {
      setCreating(false);
    }
  }

  async function removeMailbox(m: ApiHostedMailbox) {
    if (deleting) return;
    setDeleting(m.id);
    try {
      await api.deleteHostedMailbox(m.projectId, m.id);
      await load();
    } catch {
      /* swallow — the row stays; a later reload reconciles */
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Cantila Mail · live" : "Cantila Mail"}
        title="Hosted mailboxes"
        lead="Real inboxes — you@yourdomain.com — hosted on Cantila Mail, one click from any project. Separate from the transactional mailbox each project is auto-wired with."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2.5 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> connected
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink-faint">
                control plane offline
              </span>
            )}
            <button
              onClick={openCreate}
              disabled={liveMode !== true || (!isOwner && projects.length === 0)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright disabled:cursor-default disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New mailbox
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-2xs text-ink-faint">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-ember" />
          Loading mailboxes…
        </div>
      ) : liveMode === false ? (
        <div className="panel flex flex-col items-center gap-2 py-16 text-center">
          <AlertCircle className="h-6 w-6 text-ink-faint" />
          <p className="text-sm font-medium text-ink">Control plane offline</p>
          <p className="max-w-sm text-2xs text-ink-faint">
            Hosted mailboxes are live-only — start the control plane on :8080
            to list and create them.
          </p>
        </div>
      ) : mailboxes.length === 0 ? (
        <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Inbox className="h-7 w-7 text-ink-faint" />
          <p className="text-sm font-medium text-ink">
            No hosted mailboxes yet
          </p>
          <p className="max-w-sm text-2xs text-ink-faint">
            Create a real inbox on any project — webmail, IMAP and SMTP come
            with it.
          </p>
          {(projects.length > 0 || isOwner) && (
            <button
              onClick={openCreate}
              className="mt-1 text-2xs font-medium text-ember hover:underline"
            >
              Create your first mailbox
            </button>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden p-0">
          <div className="hidden grid-cols-[1.6fr_1.2fr_0.7fr_0.9fr_0.6fr] gap-4 border-b border-border-soft px-5 py-2.5 kv md:grid">
            <span>Mailbox</span>
            <span>Project</span>
            <span>Kind</span>
            <span>Storage</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-border-soft">
            {mailboxes.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 md:grid-cols-[1.6fr_1.2fr_0.7fr_0.9fr_0.6fr] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-info">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm text-ink">
                      {m.address}
                    </div>
                    <div className="truncate text-2xs text-ink-faint">
                      {m.displayName}
                    </div>
                  </div>
                </div>
                <span className="truncate font-mono text-2xs text-ink-dim">
                  {projectName(m.projectId)}
                </span>
                <span>
                  <Pill tone={m.kind === "shared" ? "info" : "neutral"}>
                    {m.kind}
                  </Pill>
                </span>
                <span className="font-mono text-2xs text-ink-dim">
                  {formatMb(m.usedMb)} / {formatMb(m.quotaMb)}
                </span>
                <span className="flex items-center justify-end gap-2">
                  <Pill tone={m.status === "active" ? "live" : "warn"}>
                    {m.status}
                  </Pill>
                  <button
                    onClick={() => removeMailbox(m)}
                    disabled={deleting !== null}
                    aria-label={`Delete ${m.address}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint transition-colors hover:border-down/40 hover:text-down disabled:opacity-50"
                  >
                    {deleting === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setOneTimePassword(null);
          setCreatedAddress(null);
        }}
        title="New hosted mailbox"
        description="A real inbox on Cantila Mail."
        footer={
          oneTimePassword ? (
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                setOneTimePassword(null);
                setCreatedAddress(null);
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  mode === "platform"
                    ? createPlatformMailbox(form.address)
                    : createMailbox()
                }
                disabled={
                  !form.address.trim() ||
                  creating ||
                  (mode === "project" && !form.projectId)
                }
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" strokeWidth={2.4} />
                )}
                Create mailbox
              </Button>
            </>
          )
        }
      >
        {oneTimePassword ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">
              Mailbox{" "}
              <span className="font-mono">{createdAddress}</span> created
            </p>
            <p className="text-2xs text-ink-faint">
              Copy this password now — it is shown once and never stored.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-surface-2 px-3 py-2 font-mono text-2xs text-ink">
                {oneTimePassword}
              </code>
              <Button
                variant="ghost"
                onClick={() =>
                  void navigator.clipboard?.writeText(oneTimePassword)
                }
              >
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isOwner && (
              <Field label="Domain">
                <div className="flex gap-2">
                  {(["platform", "project"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cx(
                        "rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                        mode === m
                          ? "bg-surface-3 text-ink ring-1 ring-border"
                          : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {m === "platform" ? "cantila.app (platform)" : "Project domain"}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {mode === "project" && (
              <Field label="Project">
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm({ ...form, projectId: e.target.value })
                  }
                  className={inputClass}
                >
                  {projects.length === 0 && (
                    <option value="">No projects</option>
                  )}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Address">
              {mode === "platform" ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        createPlatformMailbox(form.address);
                    }}
                    placeholder="info"
                    className={cx(inputClass, "font-mono")}
                  />
                  <span className="shrink-0 font-mono text-2xs text-ink-faint">
                    @cantila.app
                  </span>
                </div>
              ) : (
                <input
                  autoFocus
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createMailbox();
                  }}
                  placeholder="you@yourdomain.com"
                  className={cx(inputClass, "font-mono")}
                />
              )}
            </Field>

            <Field
              label="Display name"
              hint="Optional — defaults to the address local-part."
            >
              <input
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                placeholder="Jane Doe"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Kind">
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kind: e.target.value as "personal" | "shared",
                    })
                  }
                  className={inputClass}
                >
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                </select>
              </Field>
              <Field label="Quota">
                <select
                  value={String(form.quotaMb)}
                  onChange={(e) =>
                    setForm({ ...form, quotaMb: Number(e.target.value) })
                  }
                  className={inputClass}
                >
                  {QUOTA_PRESETS.map((q) => (
                    <option key={q.mb} value={q.mb}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {error && (
              <p className="rounded-md border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
                {error}
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
