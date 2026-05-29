"use client";

/* ============================================================
   Cantilapay — Console dashboard (plan §25, Phase 6).

   Single-page overview of the tenant's cantilapay account, styled
   with the Console design system (Panel / Pill / Button / Modal /
   CopyButton). Sections:

     - enable gate (pre-provision)
     - account status + onboarding stepper
     - adapter probe ("Stub" vs "Adyen for Platforms (test)")
     - API keys: list + issue (modal) + revoke (confirm modal)
     - webhook endpoints: list + register (modal)
     - recent audit log

   Subsequent drops add per-section sub-pages (/cantilapay/payments,
   /subscriptions, etc.) following the same pattern as the existing
   `(console)/billing` surface.
   ============================================================ */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Wallet,
  KeyRound,
  Webhook,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  ScrollText,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  cantilapayApi,
  type CantilapayAccount,
  type CantilapayApiKey,
  type CantilapayApiKeyIssued,
  type CantilapayAuditEntry,
  type CantilapayMode,
  type CantilapayWebhookEndpoint,
} from "@/lib/cantilapay-api";
import {
  cx,
  Pill,
  Panel,
  PageHeader,
  SectionLabel,
  Button,
  KeyVal,
} from "../ui";
import Modal, { Field, inputClass } from "../Modal";
import CopyButton from "../CopyButton";

/* ---------- state ---------- */

interface State {
  loading: boolean;
  enabled: boolean;
  account: CantilapayAccount | null;
  adapterLabel: string | null;
  adapterLive: boolean;
  keys: CantilapayApiKey[];
  webhooks: CantilapayWebhookEndpoint[];
  audit: CantilapayAuditEntry[];
  freshKey: CantilapayApiKeyIssued | null;
  freshWebhookSecret: { id: string; secret: string } | null;
  busy: boolean;
  error: string | null;
}

const INITIAL: State = {
  loading: true,
  enabled: false,
  account: null,
  adapterLabel: null,
  adapterLive: false,
  keys: [],
  webhooks: [],
  audit: [],
  freshKey: null,
  freshWebhookSecret: null,
  busy: false,
  error: null,
};

/* ---------- helpers ---------- */

type PillTone = "neutral" | "ember" | "live" | "info" | "violet" | "warn" | "down";

const ACCOUNT_TONE: Record<string, PillTone> = {
  active: "live",
  onboarding: "ember",
  created: "info",
  rejected: "down",
  disabled: "neutral",
};

const ONBOARDING_STEPS: { key: string; label: string }[] = [
  { key: "created", label: "Created" },
  { key: "onboarding", label: "Onboarding" },
  { key: "active", label: "Active" },
];

function stepIndex(status: string | undefined): number {
  switch (status) {
    case "created":
      return 0;
    case "onboarding":
      return 1;
    case "active":
      return 2;
    default:
      return 0; // rejected / disabled sit at the start visually
  }
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

/* ---------- component ---------- */

export default function CantilapayDashboard() {
  const [state, setState] = useState<State>(INITIAL);

  // modal state
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueKind, setIssueKind] = useState<"publishable" | "secret">("secret");
  const [issueMode, setIssueMode] = useState<CantilapayMode>("test");
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMode, setWebhookMode] = useState<CantilapayMode>("test");
  const [revokeTarget, setRevokeTarget] = useState<CantilapayApiKey | null>(null);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const health = await cantilapayApi.health().catch(() => null);
      let account: CantilapayAccount | null = null;
      let enabled = false;
      try {
        account = await cantilapayApi.me();
        enabled = true;
      } catch {
        // not enabled yet
      }
      let keys: CantilapayApiKey[] = [];
      let webhooks: CantilapayWebhookEndpoint[] = [];
      let audit: CantilapayAuditEntry[] = [];
      if (enabled) {
        try {
          keys = (await cantilapayApi.listKeys()).keys;
        } catch {
          /* keep empty */
        }
        try {
          webhooks = (await cantilapayApi.listWebhookEndpoints()).endpoints;
        } catch {
          /* keep empty */
        }
        try {
          audit = (await cantilapayApi.listAudit(50)).entries;
        } catch {
          /* keep empty */
        }
      }
      setState({
        ...INITIAL,
        loading: false,
        enabled,
        account,
        adapterLabel: health?.adapter ?? null,
        adapterLive: health?.live ?? false,
        keys,
        webhooks,
        audit,
      });
    } catch (err) {
      setState({
        ...INITIAL,
        loading: false,
        error: err instanceof Error ? err.message : "failed to load",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setBusy = (busy: boolean, error: string | null = null) =>
    setState((s) => ({ ...s, busy, error }));

  const onEnable = useCallback(async () => {
    setBusy(true);
    try {
      await cantilapayApi.enable("USA");
      await refresh();
    } catch (err) {
      setBusy(false, err instanceof Error ? err.message : "enable failed");
    }
  }, [refresh]);

  const onOnboard = useCallback(async () => {
    setBusy(true);
    try {
      const link = await cantilapayApi.onboardingLink({
        mode: "test",
        country: state.account?.country ?? "USA",
        returnUrl: `${window.location.origin}/cantilapay?onboarded=1`,
      });
      window.location.assign(link.url);
    } catch (err) {
      setBusy(false, err instanceof Error ? err.message : "onboarding failed");
    }
  }, [state.account]);

  const onIssueKey = useCallback(async () => {
    setBusy(true);
    try {
      const issued = await cantilapayApi.issueKey({
        name: `${issueMode} ${issueKind} key`,
        kind: issueKind,
        mode: issueMode,
      });
      setIssueOpen(false);
      await refresh();
      setState((s) => ({ ...s, freshKey: issued }));
    } catch (err) {
      setBusy(false, err instanceof Error ? err.message : "issue key failed");
    }
  }, [issueKind, issueMode, refresh]);

  const onRevokeKey = useCallback(async () => {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await cantilapayApi.revokeKey(revokeTarget.id);
      setRevokeTarget(null);
      await refresh();
    } catch (err) {
      setBusy(false, err instanceof Error ? err.message : "revoke failed");
    }
  }, [revokeTarget, refresh]);

  const onAddWebhook = useCallback(async () => {
    const url = webhookUrl.trim();
    if (!url) return;
    setBusy(true);
    try {
      const created = await cantilapayApi.createWebhookEndpoint({
        url,
        mode: webhookMode,
      });
      setWebhookOpen(false);
      setWebhookUrl("");
      await refresh();
      setState((s) => ({
        ...s,
        freshWebhookSecret: { id: created.id, secret: created.signingSecret },
      }));
    } catch (err) {
      setBusy(false, err instanceof Error ? err.message : "create webhook failed");
    }
  }, [webhookUrl, webhookMode, refresh]);

  const adapterPill = state.adapterLabel ? (
    <Pill tone={state.adapterLive ? "live" : "neutral"}>
      <ShieldCheck className="h-3 w-3" />
      {state.adapterLabel}
      {state.adapterLive ? " · live" : " · stub"}
    </Pill>
  ) : null;

  /* ---------- loading ---------- */

  if (state.loading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Payments" title="Cantilapay" lead="Loading your payments account…" />
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-28 animate-pulse bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- enable gate ---------- */

  if (!state.enabled) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ember/10 ring-1 ring-ember/20">
            <Wallet className="h-7 w-7 text-ember" strokeWidth={2} />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Cantilapay
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink-dim">
            The 12th Cantila product surface — let your end-users pay you with a
            single API call. Built on Adyen for Platforms (not Stripe). Your
            customers see <span className="text-ink">your</span> business name
            on their receipts; you are the merchant of record.
          </p>
          {adapterPill && <div className="mt-4">{adapterPill}</div>}
        </div>

        {state.error && (
          <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-2xs text-down">
            {state.error}
          </div>
        )}

        <Panel className="flex flex-col items-center gap-4 text-center">
          <div className="text-sm text-ink-dim">
            Enabling provisions your Cantilapay account in <strong className="text-ink">test mode</strong> — issue API keys,
            register webhooks, and run test payments. No charges until you complete onboarding and go live.
          </div>
          <Button variant="primary" onClick={() => void onEnable()} disabled={state.busy}>
            {state.busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Enable Cantilapay
          </Button>
        </Panel>
      </div>
    );
  }

  /* ---------- enabled dashboard ---------- */

  const acc = state.account;
  const accTone: PillTone = ACCOUNT_TONE[acc?.status ?? "created"] ?? "neutral";
  const curStep = stepIndex(acc?.status);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Payments"
        title="Cantilapay"
        lead="Accept payments under your own brand — you are the merchant of record, built on Adyen for Platforms."
        actions={
          <div className="flex items-center gap-2">
            {adapterPill}
            {acc && (
              <Pill tone={accTone}>
                {acc.status}
              </Pill>
            )}
          </div>
        }
      />

      {state.error && (
        <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-2xs text-down">
          {state.error}
        </div>
      )}

      {/* fresh key reveal */}
      {state.freshKey && (
        <Panel className="border-live/40 bg-live/[0.06]">
          <SectionLabel
            right={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setState((s) => ({ ...s, freshKey: null }))}
              >
                Dismiss
              </Button>
            }
          >
            New API key — shown once
          </SectionLabel>
          <p className="mb-3 text-2xs text-ink-dim">
            Save this now. Only the prefix{" "}
            <code className="text-ink">{state.freshKey.prefix}…</code> is visible
            afterwards.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-ink">
              {state.freshKey.rawKey}
            </code>
            <CopyButton value={state.freshKey.rawKey} label="Copy" />
          </div>
        </Panel>
      )}

      {/* fresh webhook secret reveal */}
      {state.freshWebhookSecret && (
        <Panel className="border-live/40 bg-live/[0.06]">
          <SectionLabel
            right={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setState((s) => ({ ...s, freshWebhookSecret: null }))}
              >
                Dismiss
              </Button>
            }
          >
            New webhook signing secret — shown once
          </SectionLabel>
          <p className="mb-3 text-2xs text-ink-dim">
            Your server verifies the{" "}
            <code className="text-ink">Cantilapay-Signature</code> header with
            this.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-ink">
              {state.freshWebhookSecret.secret}
            </code>
            <CopyButton value={state.freshWebhookSecret.secret} label="Copy" />
          </div>
        </Panel>
      )}

      {/* account status + onboarding */}
      <Panel>
        <SectionLabel
          right={
            acc && acc.status !== "active" ? (
              <Button size="sm" variant="primary" onClick={() => void onOnboard()} disabled={state.busy}>
                {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Continue onboarding
              </Button>
            ) : undefined
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-ink-faint" />
            Account status
          </span>
        </SectionLabel>

        {/* stepper */}
        <div className="mb-5 flex items-center">
          {ONBOARDING_STEPS.map((step, i) => {
            const done = i < curStep;
            const current = i === curStep;
            return (
              <div key={step.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cx(
                      "flex h-7 w-7 items-center justify-center rounded-full text-2xs font-semibold ring-1 transition-colors",
                      done && "bg-live/15 text-live ring-live/30",
                      current && "bg-ember/15 text-ember ring-ember/30",
                      !done && !current && "bg-surface-3 text-ink-faint ring-border",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <span
                    className={cx(
                      "text-2xs",
                      current ? "text-ink" : "text-ink-faint",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < ONBOARDING_STEPS.length - 1 && (
                  <span
                    className={cx(
                      "mx-2 h-px flex-1 transition-colors",
                      i < curStep ? "bg-live/40" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="divide-y divide-border-soft">
          <KeyVal k="Status">
            <Pill tone={accTone}>{acc?.status ?? "—"}</Pill>
          </KeyVal>
          <KeyVal k="Readiness">
            <span className="inline-flex gap-1.5">
              <Pill tone={acc?.testReady ? "live" : "neutral"}>
                test {acc?.testReady ? "ready" : "pending"}
              </Pill>
              <Pill tone={acc?.liveReady ? "live" : "neutral"}>
                live {acc?.liveReady ? "ready" : "pending"}
              </Pill>
            </span>
          </KeyVal>
          <KeyVal k="Platform fee">
            {((acc?.platformFeeBps ?? 0) / 100).toFixed(2)}%
          </KeyVal>
          <KeyVal k="Country">{acc?.country ?? "—"}</KeyVal>
        </div>
      </Panel>

      {/* API keys */}
      <Panel>
        <SectionLabel
          right={
            <Button size="sm" variant="outline" onClick={() => setIssueOpen(true)} disabled={state.busy}>
              <Plus className="h-4 w-4" />
              Issue key
            </Button>
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-ink-faint" />
            API keys
          </span>
        </SectionLabel>

        {state.keys.length === 0 ? (
          <EmptyRow icon={<KeyRound className="h-5 w-5" />} text="No API keys yet. Issue one to start integrating." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-soft">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-2xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <Th>Name</Th>
                  <Th>Kind</Th>
                  <Th>Mode</Th>
                  <Th>Prefix</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {state.keys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-2/50">
                    <Td className="text-ink">{k.name}</Td>
                    <Td><Pill tone={k.kind === "secret" ? "violet" : "info"}>{k.kind}</Pill></Td>
                    <Td><Pill tone={k.mode === "live" ? "ember" : "neutral"}>{k.mode}</Pill></Td>
                    <Td><code className="font-mono text-2xs text-ink-dim">{k.prefix}…</code></Td>
                    <Td><Pill tone={k.revokedAt ? "down" : "live"}>{k.revokedAt ? "revoked" : "active"}</Pill></Td>
                    <Td className="font-mono text-2xs text-ink-faint">{shortDate(k.createdAt)}</Td>
                    <Td className="text-right">
                      {!k.revokedAt && (
                        <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(k)} disabled={state.busy}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* webhook endpoints */}
      <Panel>
        <SectionLabel
          right={
            <Button size="sm" variant="outline" onClick={() => setWebhookOpen(true)} disabled={state.busy}>
              <Plus className="h-4 w-4" />
              Register endpoint
            </Button>
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <Webhook className="h-3.5 w-3.5 text-ink-faint" />
            Webhook endpoints
          </span>
        </SectionLabel>

        {state.webhooks.length === 0 ? (
          <EmptyRow icon={<Webhook className="h-5 w-5" />} text="No webhook endpoints yet. Register a URL to receive events." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-soft">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-2xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <Th>URL</Th>
                  <Th>Mode</Th>
                  <Th>Events</Th>
                  <Th>Secret</Th>
                  <Th>Last delivery</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {state.webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-surface-2/50">
                    <Td className="max-w-[260px] truncate text-ink">{w.url}</Td>
                    <Td><Pill tone={w.mode === "live" ? "ember" : "neutral"}>{w.mode}</Pill></Td>
                    <Td className="text-2xs text-ink-dim">{w.enabledEvents}</Td>
                    <Td><code className="font-mono text-2xs text-ink-faint">{w.signingSecretPrefix}…</code></Td>
                    <Td className="font-mono text-2xs text-ink-faint">{shortDate(w.lastDeliveryAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* recent activity */}
      <Panel>
        <SectionLabel>
          <span className="inline-flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5 text-ink-faint" />
            Recent activity
          </span>
        </SectionLabel>
        {state.audit.length === 0 ? (
          <EmptyRow icon={<ScrollText className="h-5 w-5" />} text="No activity yet." />
        ) : (
          <ul className="divide-y divide-border-soft">
            {state.audit.slice(0, 25).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <Pill tone="neutral">{e.type}</Pill>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-dim">{e.message}</span>
                <span className="shrink-0 font-mono text-2xs text-ink-faint">{shortDate(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-2xs text-ink-faint">
        Phase 6.0 dashboard surface. Per-section pages (payments, subscriptions,
        customers, payouts) ship as Phase 6.1+. See plan §25.
      </p>

      {/* ---------- issue key modal ---------- */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue an API key"
        description="Publishable keys are safe for client code; secret keys must stay server-side."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void onIssueKey()} disabled={state.busy}>
              {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Issue key
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Kind">
            <select
              className={inputClass}
              value={issueKind}
              onChange={(e) => setIssueKind(e.target.value as "publishable" | "secret")}
            >
              <option value="secret">Secret (server-side)</option>
              <option value="publishable">Publishable (client-side)</option>
            </select>
          </Field>
          <Field label="Mode" hint="Live keys only work once your account is live-ready.">
            <select
              className={inputClass}
              value={issueMode}
              onChange={(e) => setIssueMode(e.target.value as CantilapayMode)}
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </Field>
        </div>
      </Modal>

      {/* ---------- register webhook modal ---------- */}
      <Modal
        open={webhookOpen}
        onClose={() => setWebhookOpen(false)}
        title="Register a webhook endpoint"
        description="Cantilapay POSTs signed events to this URL. You'll get a signing secret once."
        footer={
          <>
            <Button variant="ghost" onClick={() => setWebhookOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void onAddWebhook()} disabled={state.busy || !webhookUrl.trim()}>
              {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
              Register
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Endpoint URL">
            <input
              className={inputClass}
              type="url"
              placeholder="https://api.yourapp.com/cantilapay/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </Field>
          <Field label="Mode">
            <select
              className={inputClass}
              value={webhookMode}
              onChange={(e) => setWebhookMode(e.target.value as CantilapayMode)}
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </Field>
        </div>
      </Modal>

      {/* ---------- revoke confirm modal ---------- */}
      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke API key?"
        description="This immediately stops the key from authenticating. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void onRevokeKey()} disabled={state.busy}>
              {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Revoke key
            </Button>
          </>
        }
      >
        {revokeTarget && (
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <span className="text-ink">{revokeTarget.name}</span>
            <span className="ml-2 font-mono text-2xs text-ink-faint">{revokeTarget.prefix}…</span>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx("px-3 py-2.5 align-middle", className)}>{children}</td>;
}

function EmptyRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface-2/40 py-8 text-center">
      <span className="text-ink-faint">{icon}</span>
      <span className="text-2xs text-ink-dim">{text}</span>
    </div>
  );
}
