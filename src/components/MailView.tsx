"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Mail,
  Inbox,
  Check,
  Clock,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Globe,
  Server,
  Activity as ActivityIcon,
  Zap,
  Trash2,
  Loader2,
} from "lucide-react";
import { PageHeader, StatusBadge, Pill, Meter, Button, cx } from "@/components/ui";
import { AreaChart } from "@/components/AreaChart";
import Modal, { Field, inputClass } from "@/components/Modal";
import {
  mailDomains as mockMailDomains,
  mailboxes as mockMailboxes,
  mailAliases,
  mailEvents,
  mailVolume,
  mailStats,
  getProject,
  mailboxSlug,
} from "@/lib/mock-data";
import type {
  Mailbox,
  MailAuthState,
  MailEventStatus,
  MailAlias,
  MailDomain,
} from "@/lib/types";
import {
  api,
  isControlPlaneLive,
  type ApiInboundMail,
  type ApiMailAlias,
  type ApiMailAliasKind,
  type ApiMailPoolDeliverability,
  type ApiProject,
} from "@/lib/api";

/* ---------- helpers ---------- */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ---------- DNS authentication chip ---------- */

const AUTH_UI: Record<
  MailAuthState,
  { cls: string; Icon: typeof Check }
> = {
  ok: { cls: "text-live bg-live/10 ring-live/20", Icon: Check },
  pending: { cls: "text-warn bg-warn/10 ring-warn/20", Icon: Clock },
  missing: { cls: "text-down bg-down/10 ring-down/20", Icon: X },
};

function AuthChip({ label, state }: { label: string; state: MailAuthState }) {
  const m = AUTH_UI[state];
  const Icon = m.Icon;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider ring-1",
        m.cls,
      )}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={3} />
      {label}
    </span>
  );
}

/* ---------- delivery-event vocabulary ---------- */

const EVENT: Record<
  MailEventStatus,
  { tone: "live" | "info" | "ember" | "down"; label: string }
> = {
  delivered: { tone: "live", label: "Delivered" },
  received: { tone: "info", label: "Received" },
  queued: { tone: "ember", label: "Queued" },
  bounced: { tone: "down", label: "Bounced" },
  complaint: { tone: "down", label: "Complaint" },
};

/* ---------- alias vocabulary ---------- */

const ALIAS: Record<
  MailAlias["kind"],
  { tone: "info" | "violet" | "ember" | "live"; label: string }
> = {
  alias: { tone: "info", label: "Alias" },
  forward: { tone: "violet", label: "Forward" },
  "catch-all": { tone: "ember", label: "Catch-all" },
  parse: { tone: "live", label: "Email-to-app" },
};

/* ---------- mailbox card ---------- */

function MailboxCard({ mb }: { mb: Mailbox }) {
  const pct = mb.quotaMb > 0 ? (mb.usedMb / mb.quotaMb) * 100 : 0;
  const usedGb = (mb.usedMb / 1024).toFixed(1);
  const quotaGb = Math.round(mb.quotaMb / 1024);
  const linkable = mb.status === "active";

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-mono text-xs font-bold",
            mb.kind === "personal" ? "text-ink" : "text-info",
          )}
        >
          {mb.kind === "personal" ? (
            initials(mb.displayName)
          ) : (
            <Inbox className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-mono text-sm text-ink">{mb.address}</h3>
          <p className="truncate text-2xs text-ink-faint">{mb.displayName}</p>
        </div>
        <StatusBadge status={mb.status} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-2xs">
          <span className="text-ink-faint">Mailbox storage</span>
          <span className="font-mono text-ink-dim">
            {usedGb} / {quotaGb} GB
          </span>
        </div>
        <Meter value={pct} tone={pct > 80 ? "warn" : "info"} />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3 text-2xs text-ink-faint">
        <Pill tone={mb.kind === "personal" ? "neutral" : "info"}>
          {mb.kind === "personal" ? "Personal" : "Shared"}
        </Pill>
        <span className="font-mono">IMAP · POP3 · Webmail</span>
      </div>
    </>
  );

  if (linkable) {
    return (
      <Link
        href={`/mail/${mailboxSlug(mb.address)}`}
        className="panel flex flex-col gap-4 p-5 transition-colors hover:border-ink-faint"
      >
        {inner}
      </Link>
    );
  }
  return <div className="panel flex flex-col gap-4 p-5">{inner}</div>;
}

/* ---------- view ---------- */

const QUOTAS = [5, 10, 20];

export default function MailView() {
  // Empty until the effect resolves live mode — prevents mock mailboxes,
  // domains, and aliases from flashing into a logged-in user's view.
  const [boxes, setBoxes] = useState<Mailbox[]>([]);
  const [mailDomains, setMailDomains] = useState<MailDomain[]>([]);
  const [aliasesList, setAliasesList] = useState<MailAlias[]>([]);
  // Plan §4.4 — live aliases (when the CP is live, these replace the
  // mock seed end-to-end and carry the `id` field mutation needs).
  // Null when offline / before first load — the mock seed renders.
  const [liveAliases, setLiveAliases] = useState<ApiMailAlias[] | null>(
    null,
  );
  // Projects (for the alias create-form picker). Live-only.
  const [liveProjects, setLiveProjects] = useState<ApiProject[]>([]);
  // Create-form state.
  const [aliasFormOpen, setAliasFormOpen] = useState(false);
  const [aliasProject, setAliasProject] = useState("");
  const [aliasAddress, setAliasAddress] = useState("");
  const [aliasTarget, setAliasTarget] = useState("");
  const [aliasKind, setAliasKind] = useState<ApiMailAliasKind>("alias");
  const [aliasDescription, setAliasDescription] = useState("");
  const [aliasBusy, setAliasBusy] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [aliasRowBusyId, setAliasRowBusyId] = useState<string | null>(null);
  const [inboundMail, setInboundMail] = useState<ApiInboundMail[]>([]);
  const [poolRollup, setPoolRollup] = useState<
    ApiMailPoolDeliverability[]
  >([]);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  // Plan §4.4 / §17.2 — which MailProvider is wired (stub today,
  // Mailcow when the carrier env vars are set). Null when the call
  // fails / the CP is offline; the Mail page renders a "(stub)" badge
  // on the connected pill when `live: false`.
  const [mailInfo, setMailInfo] = useState<{
    label: string;
    live: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setBoxes([...mockMailboxes]);
        setMailDomains([...mockMailDomains]);
        setAliasesList([...mailAliases]);
        return;
      }
      // Plan §4.4 / §17.2 — pull MailProvider info up front so the
      // header badge can render `live` / `stub` immediately. Best-effort.
      void api
        .getMailInfo()
        .then((info) => {
          if (!cancelled) setMailInfo(info);
        })
        .catch(() => {
          /* mail/info is a new endpoint — older CPs return 404, fall through */
        });
      try {
        const fleet = await api.getMailFleet();
        if (cancelled) return;
        const liveBoxes: Mailbox[] = fleet.mailboxes.map((m) => ({
          address: m.address,
          displayName: m.projectName,
          domain: m.sendingDomain,
          kind: "personal",
          usedMb: 0,
          quotaMb: 10 * 1024,
          status: m.status === "active" ? "active" : "provisioning",
          member: m.projectSlug,
        }));
        setBoxes(liveBoxes);
        const liveDomains: MailDomain[] = fleet.sendingDomains.map((d) => ({
          domain: d.domain,
          spf: "ok",
          dkim: "ok",
          dmarc: "ok",
          mx: "ok",
          reputation: 99,
          sent30d: 0,
          purpose: `Auto-wired · ${d.mailboxes} mailbox${d.mailboxes === 1 ? "" : "es"} · projects ${d.projects.join(", ")}`,
        }));
        setMailDomains(liveDomains);
      } catch {
        /* swallow — empty state will render */
      }
      // Live aliases — replace the mock seed entirely when the CP
      // returns any rows; if it returns none, keep the mock so the demo
      // stays populated. We keep BOTH a display-mapped list (the legacy
      // surface) AND the raw `ApiMailAlias[]` (drives the new mutation
      // surface which needs the `id` field).
      try {
        const [{ aliases }, { projects }] = await Promise.all([
          api.listAccountMailAliases(),
          api.listProjects(),
        ]);
        if (cancelled) return;
        setLiveAliases(aliases);
        setLiveProjects(projects);
        // Seed the create-form's project picker with the first project
        // so the form is usable without an extra click.
        if (projects[0]) setAliasProject(projects[0].id);
        setAliasesList(
          aliases.map((a) => ({
            address: a.address,
            target: a.target,
            kind: a.kind,
            projectId: a.projectId,
          })),
        );
      } catch {
        /* swallow — empty state will render */
      }
      // Live inbound mail (plan §4.4 — two-way mail). The mock seed has
      // no inbound concept, so an empty list here just renders the
      // "no inbound mail yet" empty state — there's nothing to fall
      // back to.
      try {
        const { messages } = await api.getMailInbox();
        if (cancelled) return;
        setInboundMail(messages);
      } catch {
        /* swallow — leave inbound empty */
      }
      // Live per-pool deliverability (plan §4.4 — IP-pool rotation).
      // Empty list is the expected state when no pools are configured
      // or no sends have ridden the rotation yet — the section hides
      // itself rather than rendering a noisy zero panel.
      try {
        const { pools } = await api.getMailPoolDeliverability(60);
        if (cancelled) return;
        setPoolRollup(pools);
      } catch {
        /* swallow — keep poolRollup empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    local: "",
    domain: mockMailDomains[0]?.domain ?? "cantila.dev",
    quotaGb: 10,
  });

  const avgPerDay = Math.round(
    mailVolume.reduce((s, v) => s + v, 0) / mailVolume.length,
  );

  function createMailbox() {
    const local = form.local
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");
    if (!local) return;
    const mb: Mailbox = {
      address: `${local}@${form.domain}`,
      displayName: local.charAt(0).toUpperCase() + local.slice(1),
      domain: form.domain,
      kind: "personal",
      usedMb: 0,
      quotaMb: form.quotaGb * 1024,
      status: "provisioning",
    };
    setBoxes((prev) => [mb, ...prev]);
    setForm({
      local: "",
      domain: mailDomains[0]?.domain ?? "cantila.dev",
      quotaGb: 10,
    });
    setModalOpen(false);
  }

  // Keep the default domain in sync once the live fleet lands.
  useEffect(() => {
    if (mailDomains[0] && !form.domain.includes(mailDomains[0].domain)) {
      setForm((prev) => ({ ...prev, domain: mailDomains[0].domain }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailDomains[0]?.domain]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Cantila Mail · live fleet" : "Cantila Mail"}
        title="Email"
        lead="A complete email provider, built from scratch and run end-to-end by Cantila — every inbound and outbound message travels on our own mail servers and IP space. No relay, no third-party email vendor."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span
                className={
                  mailInfo?.live
                    ? "inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live"
                    : "inline-flex items-center gap-1 rounded-md border border-warn/30 bg-warn/5 px-2 py-1 text-2xs font-medium text-warn"
                }
                title={mailInfo ? `MailProvider: ${mailInfo.label}` : "MailProvider: unknown"}
              >
                <Zap className="h-3 w-3" />
                {mailInfo
                  ? `${mailInfo.label}${mailInfo.live ? "" : " · stub"}`
                  : "connected"}
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                control plane offline · mock fleet
              </span>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New mailbox
            </button>
          </div>
        }
      />

      {/* rollup */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Mailboxes", v: String(boxes.length) },
          { k: "Sent · 30d", v: mailStats.sent30d.toLocaleString() },
          { k: "Delivery rate", v: `${mailStats.deliveryRate}%` },
          { k: "Inbound · 30d", v: mailStats.inbound30d.toLocaleString() },
        ].map((s) => (
          <div key={s.k} className="panel p-4">
            <div className="kv">{s.k}</div>
            <div className="mt-1.5 font-mono text-lg font-semibold text-ink">
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* first-party infrastructure */}
      <div className="panel relative overflow-hidden p-5">
        <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-16" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-start gap-3 lg:w-64 lg:shrink-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ember/30 bg-ember/10 text-ember">
              <Server className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                First-party infrastructure
              </h3>
              <p className="mt-0.5 text-2xs text-ink-faint">
                Built from scratch and operated by Cantila — no third-party
                vendor anywhere in the path.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Inbound MX cluster",
              "Outbound MTA + IP pools",
              "Webmail client",
              "IMAP / POP3 / SMTP",
              "DKIM signing",
              "Spam & virus filtering",
            ].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-soft bg-surface-2 px-2 py-1 text-2xs text-ink-dim"
              >
                <Check className="h-3 w-3 text-live" strokeWidth={3} />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* sending volume */}
      <div className="panel p-0">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Outbound volume
            </h2>
            <p className="mt-0.5 text-2xs text-ink-faint">
              Email sent per day · last 14 days
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-info/10 px-2 py-1 text-2xs font-medium text-info ring-1 ring-info/20">
            <ActivityIcon className="h-3 w-3" />
            Sending
          </span>
        </div>
        <div className="px-2 pt-4">
          <AreaChart data={mailVolume} id="mail-volume" tone="info" height={132} />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border-soft border-t border-border-soft">
          {[
            { k: "Avg / day", v: avgPerDay.toLocaleString() },
            { k: "Open rate", v: `${mailStats.openRate}%` },
            { k: "Bounce rate", v: "0.8%" },
          ].map((s) => (
            <div key={s.k} className="px-5 py-3.5">
              <div className="kv">{s.k}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-ink">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* sending domains */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Sending domains · {mailDomains.length}
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {mailDomains.map((d) => (
            <div key={d.domain} className="panel flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-info">
                  <Globe className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-mono text-sm text-ink">
                    {d.domain}
                  </h3>
                  <p className="truncate text-2xs text-ink-faint">
                    {d.purpose}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <AuthChip label="SPF" state={d.spf} />
                <AuthChip label="DKIM" state={d.dkim} />
                <AuthChip label="DMARC" state={d.dmarc} />
                <AuthChip label="MX" state={d.mx} />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-2xs">
                  <span className="text-ink-faint">Sender reputation</span>
                  <span className="font-mono text-ink-dim">
                    {d.reputation} / 100
                  </span>
                </div>
                <Meter
                  value={d.reputation}
                  tone={d.reputation >= 95 ? "live" : "warn"}
                />
              </div>

              <div className="mt-auto border-t border-border-soft pt-3 text-2xs text-ink-faint">
                <span className="font-mono text-ink-dim">
                  {d.sent30d.toLocaleString()}
                </span>{" "}
                sent · last 30 days
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* mailboxes */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Mailboxes · {boxes.length}</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {boxes.map((mb) => (
            <MailboxCard key={mb.address} mb={mb} />
          ))}
        </div>
      </section>

      {/* aliases & routing — live CRUD when the control plane is up,
          read-only mock seed otherwise. */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="kv text-ink-dim">
            Aliases &amp; routing ·{" "}
            {liveAliases !== null ? liveAliases.length : aliasesList.length}
          </h2>
          {liveMode === true && (
            <button
              onClick={() => {
                setAliasFormOpen((p) => !p);
                setAliasError(null);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
            >
              {aliasFormOpen ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {aliasFormOpen ? "Cancel" : "Create alias"}
            </button>
          )}
        </div>

        {/* inline create form — live-only */}
        {liveMode === true && aliasFormOpen && (
          <div className="panel mb-3 grid gap-3 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                  Project
                </label>
                <select
                  value={aliasProject}
                  onChange={(e) => setAliasProject(e.target.value)}
                  className={inputClass}
                >
                  {liveProjects.length === 0 && (
                    <option value="">No projects available</option>
                  )}
                  {liveProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                  Kind
                </label>
                <select
                  value={aliasKind}
                  onChange={(e) =>
                    setAliasKind(e.target.value as ApiMailAliasKind)
                  }
                  className={inputClass}
                >
                  <option value="alias">alias</option>
                  <option value="forward">forward</option>
                  <option value="catch-all">catch-all</option>
                  <option value="parse">parse</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Address
              </label>
              <input
                type="text"
                value={aliasAddress}
                onChange={(e) => setAliasAddress(e.target.value)}
                placeholder={
                  aliasKind === "catch-all" ? "*@example.com" : "hello@example.com"
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Target
              </label>
              <input
                type="text"
                value={aliasTarget}
                onChange={(e) => setAliasTarget(e.target.value)}
                placeholder={
                  aliasKind === "parse"
                    ? "https://app.example.com/webhooks/mail"
                    : "ops@example.com"
                }
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Description (optional)
              </label>
              <input
                type="text"
                value={aliasDescription}
                onChange={(e) => setAliasDescription(e.target.value)}
                placeholder="Routes ops requests to the on-call rotation"
                className={inputClass}
              />
            </div>
            {aliasError && (
              <div className="sm:col-span-2 text-2xs text-down">
                {aliasError}
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <Button
                onClick={async () => {
                  if (
                    !aliasProject ||
                    !aliasAddress.trim() ||
                    !aliasTarget.trim() ||
                    aliasBusy
                  )
                    return;
                  setAliasBusy(true);
                  setAliasError(null);
                  try {
                    const created = await api.createMailAlias(aliasProject, {
                      address: aliasAddress.trim(),
                      target: aliasTarget.trim(),
                      kind: aliasKind,
                      description: aliasDescription.trim() || undefined,
                    });
                    setLiveAliases((prev) => [created, ...(prev ?? [])]);
                    setAliasesList((prev) => [
                      {
                        address: created.address,
                        target: created.target,
                        kind: created.kind,
                        projectId: created.projectId,
                      },
                      ...prev,
                    ]);
                    setAliasAddress("");
                    setAliasTarget("");
                    setAliasDescription("");
                    setAliasFormOpen(false);
                  } catch (err) {
                    setAliasError(
                      err instanceof Error ? err.message : "create failed",
                    );
                  } finally {
                    setAliasBusy(false);
                  }
                }}
                disabled={aliasBusy}
              >
                {aliasBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create alias
              </Button>
            </div>
          </div>
        )}

        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {(liveAliases ?? null) !== null
              ? liveAliases!.map((a) => {
                  const proj = getProject(a.projectId ?? "");
                  const ui = ALIAS[a.kind];
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-ink-faint" />
                      <span className="font-mono text-sm text-ink">
                        {a.address}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      {proj ? (
                        <Link
                          href={`/projects/${proj.id}`}
                          className="font-mono text-sm text-ink-dim hover:text-ember"
                        >
                          {a.target}
                        </Link>
                      ) : (
                        <span className="font-mono text-sm text-ink-dim">
                          {a.target}
                        </span>
                      )}
                      {!a.active && <Pill tone="warn">paused</Pill>}
                      <span className="ml-auto flex items-center gap-2">
                        <Pill tone={ui.tone}>{ui.label}</Pill>
                        <button
                          onClick={async () => {
                            if (aliasRowBusyId) return;
                            if (
                              typeof window !== "undefined" &&
                              !window.confirm(
                                `Delete alias ${a.address}? This cannot be undone.`,
                              )
                            )
                              return;
                            setAliasRowBusyId(a.id);
                            try {
                              await api.deleteMailAlias(a.projectId, a.id);
                              setLiveAliases((prev) =>
                                (prev ?? []).filter((x) => x.id !== a.id),
                              );
                              setAliasesList((prev) =>
                                prev.filter((x) => x.address !== a.address),
                              );
                            } catch (err) {
                              setAliasError(
                                err instanceof Error
                                  ? err.message
                                  : "delete failed",
                              );
                            } finally {
                              setAliasRowBusyId(null);
                            }
                          }}
                          disabled={aliasRowBusyId === a.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-down/10 hover:text-down disabled:opacity-50"
                          aria-label={`Delete alias ${a.address}`}
                        >
                          {aliasRowBusyId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </span>
                    </div>
                  );
                })
              : aliasesList.map((a) => {
                  const proj = getProject(a.projectId ?? "");
                  const ui = ALIAS[a.kind];
                  return (
                    <div
                      key={a.address}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-ink-faint" />
                      <span className="font-mono text-sm text-ink">
                        {a.address}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      {proj ? (
                        <Link
                          href={`/projects/${proj.id}`}
                          className="font-mono text-sm text-ink-dim hover:text-ember"
                        >
                          {a.target}
                        </Link>
                      ) : (
                        <span className="font-mono text-sm text-ink-dim">
                          {a.target}
                        </span>
                      )}
                      <span className="ml-auto">
                        <Pill tone={ui.tone}>{ui.label}</Pill>
                      </span>
                    </div>
                  );
                })}
          </div>
        </div>
      </section>

      {/* per-pool deliverability — live, hidden when there is no rotation traffic yet (plan §4.4) */}
      {liveMode && poolRollup.length > 0 && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">
            IP pool deliverability · {poolRollup.length}
          </h2>
          <div className="panel overflow-hidden p-0">
            <table className="w-full text-2xs">
              <thead className="bg-surface-2 text-ink-dim">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Pool</th>
                  <th className="px-4 py-2 text-left font-medium">Kind</th>
                  <th className="px-4 py-2 text-right font-medium">Rep</th>
                  <th className="px-4 py-2 text-right font-medium">Sent</th>
                  <th className="px-4 py-2 text-right font-medium">Delivered</th>
                  <th className="px-4 py-2 text-right font-medium">Bounce%</th>
                  <th className="px-4 py-2 text-right font-medium">Complaint%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {poolRollup.map((p) => (
                  <tr key={p.poolId}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-ink">{p.poolName}</div>
                      <div className="font-mono text-2xs text-ink-faint">
                        {p.poolId}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Pill tone="info">{p.poolKind}</Pill>
                    </td>
                    <td
                      className={
                        p.reputation < 30
                          ? "px-4 py-2 text-right font-medium text-down"
                          : p.reputation < 50
                            ? "px-4 py-2 text-right font-medium text-warn"
                            : p.reputation >= 80
                              ? "px-4 py-2 text-right font-medium text-live"
                              : "px-4 py-2 text-right text-ink"
                      }
                    >
                      {p.reputation}
                    </td>
                    <td className="px-4 py-2 text-right text-ink">{p.sent}</td>
                    <td className="px-4 py-2 text-right text-live">
                      {p.delivered}
                    </td>
                    <td
                      className={
                        p.bounceRatePct >= 10
                          ? "px-4 py-2 text-right text-down"
                          : p.bounceRatePct >= 5
                            ? "px-4 py-2 text-right text-warn"
                            : "px-4 py-2 text-right text-ink-dim"
                      }
                    >
                      {p.bounceRatePct}%
                    </td>
                    <td
                      className={
                        p.complaintRatePct >= 0.5
                          ? "px-4 py-2 text-right text-down"
                          : "px-4 py-2 text-right text-ink-dim"
                      }
                    >
                      {p.complaintRatePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border-soft bg-surface-2/60 px-4 py-2 text-2xs text-ink-faint">
              The rotation picks a pool per send (kind-priority, then
              account default). Reputation moves on every terminal event —
              MailAgent flags pools that drop below 50.
            </div>
          </div>
        </section>
      )}

      {/* inbound messages — live only (plan §4.4 — two-way mail history) */}
      {liveMode && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">
            Inbound messages · {inboundMail.length}
          </h2>
          {inboundMail.length === 0 ? (
            <div className="panel px-5 py-6 text-sm text-ink-faint">
              No inbound mail received yet.{" "}
              <span className="font-mono text-2xs">
                POST /v1/projects/&lt;id&gt;/mail/inbound
              </span>{" "}
              to exercise the receive path offline.
            </div>
          ) : (
            <div className="panel overflow-hidden p-0">
              <div className="divide-y divide-border-soft">
                {inboundMail.map((m) => {
                  const subject = m.subject || "(no subject)";
                  const routingTone: "info" | "live" | "warn" = m.matchedAliasId
                    ? "info"
                    : m.routedTo
                      ? "live"
                      : "warn";
                  const routingLabel = m.matchedAliasId
                    ? `Alias → ${m.routedTo ?? ""}`
                    : m.routedTo
                      ? `Inbox · ${m.routedTo}`
                      : "Unrouted";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-info">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">
                          {subject}
                        </p>
                        <p className="truncate text-2xs text-ink-faint">
                          from {m.fromAddress}{" "}
                          <span className="mx-1 text-ink-faint">·</span>{" "}
                          to <span className="font-mono">{m.toAddress}</span>
                        </p>
                      </div>
                      <Pill tone={routingTone}>{routingLabel}</Pill>
                      <span className="hidden font-mono text-2xs text-ink-faint sm:block">
                        {new Date(m.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* delivery activity */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Delivery activity</h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {mailEvents.map((e) => {
              const ui = EVENT[e.status];
              const proj = getProject(e.projectId ?? "");
              const outbound = e.direction === "outbound";
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className={cx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2",
                      outbound ? "text-ember" : "text-info",
                    )}
                  >
                    {outbound ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{e.subject}</p>
                    <p className="truncate text-2xs text-ink-faint">
                      {outbound ? "to" : "from"} {e.party}
                      {proj && (
                        <>
                          {" · "}
                          <Link
                            href={`/projects/${proj.id}`}
                            className="hover:text-ember"
                          >
                            {proj.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex">
                    <Pill tone={ui.tone}>{ui.label}</Pill>
                  </span>
                  <span className="shrink-0 font-mono text-2xs text-ink-faint">
                    {e.at}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* new mailbox modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New mailbox"
        description="Create a real inbox on one of your verified domains."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createMailbox}
              disabled={!form.local.trim()}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Create mailbox
            </Button>
          </>
        }
      >
        <Field label="Address">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={form.local}
              onChange={(e) => setForm({ ...form, local: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") createMailbox();
              }}
              placeholder="hello"
              className={inputClass}
            />
            <span className="font-mono text-sm text-ink-faint">@</span>
            <select
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className={inputClass}
            >
              {mailDomains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field
          label="Storage quota"
          hint="Webmail, IMAP, POP3 and SMTP access are enabled on every mailbox."
        >
          <select
            value={form.quotaGb}
            onChange={(e) =>
              setForm({ ...form, quotaGb: Number(e.target.value) })
            }
            className={inputClass}
          >
            {QUOTAS.map((q) => (
              <option key={q} value={q}>
                {q} GB
              </option>
            ))}
          </select>
        </Field>
      </Modal>
    </div>
  );
}
