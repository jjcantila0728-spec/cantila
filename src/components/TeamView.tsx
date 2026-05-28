"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Shield,
  Crown,
  Code2,
  Eye,
  X,
  Zap,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { PageHeader, Pill, Button, cx } from "@/components/ui";
import Modal, { Field, inputClass } from "@/components/Modal";
import CopyButton from "@/components/CopyButton";
import { team } from "@/lib/mock-data";
import type { TeamMember } from "@/lib/types";
import {
  api,
  isControlPlaneLive,
  type ApiInvite,
  type ApiMemberRole,
  type ApiTeamMember,
} from "@/lib/api";

/* Map between the CP's lowercase roles and the Console's TitleCase labels. */
const TITLE_ROLE: Record<ApiMemberRole, TeamMember["role"]> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
};
const LOWER_ROLE: Record<TeamMember["role"], ApiMemberRole> = {
  Owner: "owner",
  Admin: "admin",
  Developer: "developer",
  Viewer: "viewer",
};

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

interface DisplayMember extends TeamMember {
  /** Membership id from the CP — present only for live rows. */
  liveId?: string;
}

const ROLE_TONE: Record<
  TeamMember["role"],
  "ember" | "info" | "live" | "neutral"
> = {
  Owner: "ember",
  Admin: "info",
  Developer: "live",
  Viewer: "neutral",
};

const INVITE_TONE: Record<
  ApiInvite["status"],
  "live" | "info" | "warn" | "down" | "neutral"
> = {
  pending: "info",
  accepted: "live",
  revoked: "neutral",
  expired: "warn",
};

const INVITE_ROLES: TeamMember["role"][] = ["Admin", "Developer", "Viewer"];

const ROLES = [
  {
    name: "Owner",
    icon: Crown,
    tone: "text-ember",
    desc: "Full control — billing, deletion, and ownership transfer.",
  },
  {
    name: "Admin",
    icon: Shield,
    tone: "text-info",
    desc: "Manage projects, domains, secrets and team members.",
  },
  {
    name: "Developer",
    icon: Code2,
    tone: "text-live",
    desc: "Deploy, read logs and edit environment variables.",
  },
  {
    name: "Viewer",
    icon: Eye,
    tone: "text-ink-dim",
    desc: "Read-only access to projects, metrics and logs.",
  },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function toDisplayMember(api: ApiTeamMember): DisplayMember {
  return {
    name: api.name,
    email: api.email,
    role: TITLE_ROLE[api.role],
    initials: initialsOf(api.name),
    lastActive: relative(api.joinedAt),
    liveId: api.id,
  };
}

function buildAcceptUrl(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export default function TeamView() {
  const [members, setMembers] = useState<DisplayMember[]>(() => [...team]);
  const [invites, setInvites] = useState<ApiInvite[]>([]);
  const [open, setOpen] = useState(false);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{
    invite: ApiInvite;
    token: string;
  } | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: TeamMember["role"];
  }>({ name: "", email: "", role: "Developer" });

  async function refreshInvites() {
    try {
      const { invites: live } = await api.listInvites();
      setInvites(live);
    } catch {
      /* control plane offline — leave list empty */
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        const { members: live } = await api.listMembers();
        if (cancelled) return;
        if (live.length > 0) {
          setMembers(live.map(toDisplayMember));
        }
      } catch {
        /* swallow — keep mock seed */
      }
      void refreshInvites();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function invite() {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!email) return;
    setError(null);
    if (liveMode) {
      setBusy(true);
      try {
        const result = await api.createInvite({
          email,
          role: LOWER_ROLE[form.role],
        });
        setReveal(result);
        setInvites((prev) => [result.invite, ...prev]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create invite.");
      } finally {
        setBusy(false);
      }
    } else {
      // Mock mode — fall back to the immediate-add behaviour so demos
      // keep working without a live control plane.
      const member: DisplayMember = {
        name: name || email.split("@")[0],
        email,
        role: form.role,
        initials: initialsOf(name || email),
        lastActive: "just invited",
      };
      setMembers((prev) => [...prev, member]);
      setForm({ name: "", email: "", role: "Developer" });
      setOpen(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setReveal(null);
    setError(null);
    setForm({ name: "", email: "", role: "Developer" });
  }

  async function remove(target: DisplayMember) {
    if (liveMode && target.liveId) {
      try {
        await api.removeMember(target.liveId);
      } catch {
        // surface as no-op
      }
    }
    setMembers((prev) => prev.filter((m) => m.email !== target.email));
  }

  async function revoke(invite: ApiInvite) {
    try {
      await api.revokeInvite(invite.id);
    } catch {
      /* surface stays consistent — refetch will reconcile */
    }
    void refreshInvites();
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Account · live team" : "Account"}
        title="Team"
        lead="Invite collaborators and control what each member can do across the workspace."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> connected
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                control plane offline · mock team
              </span>
            )}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.4} />
              Invite member
            </button>
          </div>
        }
      />

      {/* members */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Members · {members.length} seats used
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {members.map((m) => (
              <div
                key={m.email}
                className="group flex items-center gap-3.5 px-5 py-3.5"
              >
                <span
                  className={cx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                    m.you
                      ? "bg-gradient-to-br from-ember to-ember-dim text-[#1a0e08]"
                      : "bg-surface-3 text-ink-dim",
                  )}
                >
                  {m.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {m.name}
                    </span>
                    {m.you && <Pill tone="neutral">You</Pill>}
                  </div>
                  <div className="truncate font-mono text-2xs text-ink-faint">
                    {m.email}
                  </div>
                </div>
                <span className="hidden font-mono text-2xs text-ink-faint sm:block">
                  Active {m.lastActive}
                </span>
                <Pill tone={ROLE_TONE[m.role]}>{m.role}</Pill>
                {!m.you && (
                  <button
                    onClick={() => remove(m)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint opacity-0 transition-all hover:bg-down/10 hover:text-down group-hover:opacity-100"
                    aria-label={`Remove ${m.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* invites — only shown when live (the prototype mock seed has no
          invites concept) */}
      {liveMode && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">
            Invites · {invites.length} total
          </h2>
          {invites.length === 0 ? (
            <div className="panel px-5 py-6 text-sm text-ink-faint">
              No invites yet. Click <span className="text-ink">Invite member</span>{" "}
              to mint a one-time accept link.
            </div>
          ) : (
            <div className="panel overflow-hidden p-0">
              <div className="divide-y divide-border-soft">
                {invites.map((i) => (
                  <div
                    key={i.id}
                    className="group flex items-center gap-3.5 px-5 py-3.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-faint">
                      <LinkIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {i.email}
                      </div>
                      <div className="font-mono text-2xs text-ink-faint">
                        invited {relative(i.createdAt)} · expires{" "}
                        {new Date(i.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Pill tone={ROLE_TONE[TITLE_ROLE[i.role]]}>
                      {TITLE_ROLE[i.role]}
                    </Pill>
                    <Pill tone={INVITE_TONE[i.status]}>{i.status}</Pill>
                    {i.status === "pending" && (
                      <button
                        onClick={() => revoke(i)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint opacity-0 transition-all hover:bg-down/10 hover:text-down group-hover:opacity-100"
                        aria-label={`Revoke invite for ${i.email}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* roles */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Roles & permissions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.name} className="panel p-5">
                <Icon className={cx("h-5 w-5", r.tone)} />
                <h3 className="mt-3 font-display text-sm font-semibold text-ink">
                  {r.name}
                </h3>
                <p className="mt-1 text-2xs leading-relaxed text-ink-faint">
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* invite modal — mints a real one-time accept link in live mode;
          falls back to instant-add in mock mode */}
      <Modal
        open={open}
        onClose={closeModal}
        title={reveal ? "Invite created" : "Invite a member"}
        description={
          reveal
            ? "Share this one-time link with the invitee — it won't be shown again."
            : liveMode
              ? "We'll mint a one-time accept link you can share with them."
              : "Mock mode — they'll be added directly to the seeded team."
        }
        footer={
          reveal ? (
            <Button variant="primary" onClick={closeModal}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={invite}
                disabled={!form.email.trim() || busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" strokeWidth={2.4} />
                )}
                {liveMode ? "Mint invite" : "Send invite"}
              </Button>
            </>
          )
        }
      >
        {reveal ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="kv mb-1 text-ink-dim">Email</div>
              <div className="font-mono text-ink">{reveal.invite.email}</div>
            </div>
            <div>
              <div className="kv mb-1 text-ink-dim">Role</div>
              <Pill tone={ROLE_TONE[TITLE_ROLE[reveal.invite.role]]}>
                {TITLE_ROLE[reveal.invite.role]}
              </Pill>
            </div>
            <div>
              <div className="kv mb-1 text-ink-dim">Accept link</div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-2xs text-ink">
                <span className="truncate">{buildAcceptUrl(reveal.token)}</span>
                <CopyButton value={buildAcceptUrl(reveal.token)} />
              </div>
              <p className="mt-2 text-2xs text-ink-faint">
                Expires{" "}
                {new Date(reveal.invite.expiresAt).toLocaleString()}.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Field label="Email">
              <input
                autoFocus
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") invite();
                }}
                placeholder="alex@company.com"
                className={inputClass}
              />
            </Field>
            {!liveMode && (
              <Field label="Full name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Rivera"
                  className={inputClass}
                />
              </Field>
            )}
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as TeamMember["role"] })
                }
                className={inputClass}
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            {error && (
              <p className="text-2xs text-down" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
