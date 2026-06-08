"use client";

import { useEffect, useState } from "react";
import {
  Plug,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Loader2,
  Zap,
  Building2,
  UserCog,
} from "lucide-react";
import { PageHeader, Pill, Button } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { CopyField } from "@/components/CopyButton";
import Modal, { Field, inputClass } from "@/components/Modal";
import { ACCOUNT } from "@/lib/mock-data";
import {
  api,
  isControlPlaneLive,
  type ApiAccount,
  type ApiAccountPlan,
  type ApiWhoami,
} from "@/lib/api";

const MCP_TOOLS = [
  "cantila.deploy",
  "cantila.list_projects",
  "cantila.get_logs",
  "cantila.set_env",
  "cantila.provision_db",
  "cantila.add_domain",
  "cantila.scale",
  "cantila.status",
];

interface ApiKey {
  id?: string; // present on live keys
  name: string;
  preview: string;
  created: string;
  lastUsed: string;
  scope?: "read" | "deploy" | "admin";
}

const SEED_KEYS: ApiKey[] = [
  { name: "production-ci", preview: "ct_live_••••••••••a91f", created: "Mar 2026", lastUsed: "2h ago" },
  { name: "local-cli", preview: "ct_live_••••••••••3d7c", created: "Apr 2026", lastUsed: "5d ago" },
];

function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 6).padEnd(4, "0");
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function formatCreated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function SettingsView() {
  // Empty until the effect resolves live mode — keeps mock API keys out of
  // a logged-in user's key list.
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyModal, setKeyModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScope, setKeyScope] = useState<"read" | "deploy" | "admin">("deploy");
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  // Multi-tenant identity (plan §5.4). Both load from live endpoints; in
  // demo/offline mode they remain null and the UI falls back to the
  // ACCOUNT mock constant.
  const [me, setMe] = useState<ApiWhoami | null>(null);
  const [account, setAccount] = useState<ApiAccount | null>(null);

  // "Onboard a new tenant" — surfaced only when the caller is admin-scope.
  const [tenantModal, setTenantModal] = useState(false);
  const [tenantHandle, setTenantHandle] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPlan, setTenantPlan] = useState<ApiAccountPlan>("hobby");
  const [tenantBusy, setTenantBusy] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [newTenant, setNewTenant] = useState<
    { account: ApiAccount; rawKey: string } | null
  >(null);

  // White-label / reseller — sub-accounts under an agency parent
  // (plan §5.5). Loaded on mount; the Mint-sub-account affordance is
  // only shown when the caller is on an eligible plan. The new
  // sub-account's one-time admin key is revealed inline after creation
  // (same contract as the existing "Onboard tenant" flow).
  const [subAccounts, setSubAccounts] = useState<ApiAccount[]>([]);
  const [subModal, setSubModal] = useState(false);
  const [subHandle, setSubHandle] = useState("");
  const [subName, setSubName] = useState("");
  const [subPlan, setSubPlan] = useState<ApiAccountPlan>("starter");
  const [subBusy, setSubBusy] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [newSub, setNewSub] = useState<
    { account: ApiAccount; rawKey: string } | null
  >(null);
  const [rollupBusyId, setRollupBusyId] = useState<string | null>(null);
  const [rollupError, setRollupError] = useState<string | null>(null);

  async function toggleRollup(sub: ApiAccount) {
    if (rollupBusyId) return;
    setRollupBusyId(sub.id);
    setRollupError(null);
    try {
      const updated = sub.billedToAccountId
        ? await api.leaveBillingRollup(sub.id)
        : await api.enrollBillingRollup(sub.id);
      setSubAccounts((prev) =>
        prev.map((a) => (a.id === sub.id ? updated : a)),
      );
    } catch (err) {
      setRollupError(err instanceof Error ? err.message : "rollup failed");
    } finally {
      setRollupBusyId(null);
    }
  }

  // Per-account Anthropic API key (plan §4.3.1). The Settings panel
  // toggles between "set" and "edit" — in edit mode the input is empty
  // and the user must paste a fresh key (we never echo the raw value
  // back after the first set).
  const [anthropicEdit, setAnthropicEdit] = useState(false);
  const [anthropicInput, setAnthropicInput] = useState("");
  const [anthropicBusy, setAnthropicBusy] = useState(false);
  const [anthropicError, setAnthropicError] = useState<string | null>(null);

  const [claudeTokenEdit, setClaudeTokenEdit] = useState(false);
  const [claudeTokenInput, setClaudeTokenInput] = useState("");
  const [claudeTokenBusy, setClaudeTokenBusy] = useState(false);
  const [claudeTokenError, setClaudeTokenError] = useState<string | null>(null);

  // Plan §5.5 — white-label per-account branding. The four optional
  // fields are edited inline; saving immediately PATCHes the account
  // and updates the local copy so the chrome reskin (next page load)
  // reflects the new values.
  const [brandPrimary, setBrandPrimary] = useState("");
  const [brandAccent, setBrandAccent] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [brandDisplay, setBrandDisplay] = useState("");
  const [brandBusy, setBrandBusy] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandSavedAt, setBrandSavedAt] = useState<number | null>(null);

  // Self-service password change (plan §5.4). Modal-driven; the control
  // plane verifies the current password before writing the new hash.
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSavedAt, setPwSavedAt] = useState<number | null>(null);

  async function submitChangePassword() {
    if (pwBusy) return;
    setPwError(null);
    if (pwNew.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("New password and confirmation don't match.");
      return;
    }
    setPwBusy(true);
    try {
      await api.changeMyPassword({
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setPwModal(false);
      setPwSavedAt(Date.now());
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "change failed");
    } finally {
      setPwBusy(false);
    }
  }

  // Seed branding inputs from the loaded account so the form reflects
  // current values whenever the account changes (org switch, refresh).
  useEffect(() => {
    if (!account) return;
    setBrandPrimary(account.brandPrimaryColor ?? "");
    setBrandAccent(account.brandAccentColor ?? "");
    setBrandLogo(account.brandLogoUrl ?? "");
    setBrandDisplay(account.brandDisplayName ?? "");
  }, [account]);

  async function submitBranding() {
    if (brandBusy) return;
    setBrandBusy(true);
    setBrandError(null);
    try {
      const updated = await api.updateBranding({
        brandPrimaryColor: brandPrimary,
        brandAccentColor: brandAccent,
        brandLogoUrl: brandLogo,
        brandDisplayName: brandDisplay,
      });
      setAccount(updated);
      setBrandSavedAt(Date.now());
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : "save failed");
    } finally {
      setBrandBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setKeys([...SEED_KEYS]);
        return;
      }
      // Four calls fan out in parallel — none depend on each other.
      const [whoamiResult, accountResult, keysResult, subResult] =
        await Promise.allSettled([
          api.whoami(),
          api.getAccountMe(),
          api.listApiKeys(),
          api.listSubAccounts(),
        ]);
      if (cancelled) return;
      if (whoamiResult.status === "fulfilled") setMe(whoamiResult.value);
      if (accountResult.status === "fulfilled") setAccount(accountResult.value);
      if (keysResult.status === "fulfilled") {
        setKeys(
          keysResult.value.keys.map((k) => ({
            id: k.id,
            name: k.name,
            preview: `${k.prefix}••••${k.id.slice(-4)}`,
            created: formatCreated(k.createdAt),
            lastUsed: k.lastUsedAt ? formatRelative(k.lastUsedAt) : "never",
            scope: k.scope,
          })),
        );
      }
      if (subResult.status === "fulfilled") {
        setSubAccounts(subResult.value.accounts);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The current caller is allowed to onboard new tenants iff they hold an
  // admin-scope key on a live control plane. In demo/offline mode we hide
  // the affordance — there's no auth wall to gate it.
  const callerScope = me?.authenticated ? me.scope : undefined;
  const canOnboardTenant = liveMode === true && callerScope === "admin";

  // White-label / reseller eligibility (plan §5.5) — an account on
  // agency or dedicated tier can mint sub-accounts under it. The
  // section renders even when ineligible (so the user sees the upgrade
  // path) but the Mint button is gated.
  const canMintSubAccount =
    liveMode === true &&
    account?.plan !== undefined &&
    (account.plan === "agency" || account.plan === "dedicated") &&
    !account.parentAccountId;

  async function submitSubAccount() {
    const name = subName.trim();
    const handle = subHandle.trim().toLowerCase();
    if (!name || !handle || subBusy) return;
    setSubBusy(true);
    setSubError(null);
    try {
      const result = await api.createSubAccount({
        name,
        handle,
        plan: subPlan,
      });
      setNewSub({ account: result.account, rawKey: result.rawKey });
      setSubAccounts((prev) => [...prev, result.account]);
      setSubName("");
      setSubHandle("");
      setSubModal(false);
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubBusy(false);
    }
  }

  async function saveAnthropicKey() {
    const key = anthropicInput.trim();
    if (key.length < 20) {
      setAnthropicError("That doesn't look like a valid Anthropic API key.");
      return;
    }
    setAnthropicBusy(true);
    setAnthropicError(null);
    try {
      const updated = await api.setAnthropicKey(key);
      setAccount(updated);
      setAnthropicInput("");
      setAnthropicEdit(false);
    } catch (err) {
      setAnthropicError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setAnthropicBusy(false);
    }
  }

  async function removeAnthropicKey() {
    setAnthropicBusy(true);
    setAnthropicError(null);
    try {
      const updated = await api.clearAnthropicKey();
      setAccount(updated);
      setAnthropicInput("");
      setAnthropicEdit(false);
    } catch (err) {
      setAnthropicError(err instanceof Error ? err.message : "Failed to clear");
    } finally {
      setAnthropicBusy(false);
    }
  }

  async function saveClaudeToken() {
    const token = claudeTokenInput.trim();
    if (token.length < 20) {
      setClaudeTokenError("That doesn't look like a valid token.");
      return;
    }
    setClaudeTokenBusy(true);
    setClaudeTokenError(null);
    try {
      const updated = await api.setClaudeSubscriptionToken(token);
      setAccount(updated);
      setClaudeTokenInput("");
      setClaudeTokenEdit(false);
    } catch (err) {
      setClaudeTokenError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setClaudeTokenBusy(false);
    }
  }

  async function removeClaudeToken() {
    setClaudeTokenBusy(true);
    setClaudeTokenError(null);
    try {
      const updated = await api.clearClaudeSubscriptionToken();
      setAccount(updated);
      setClaudeTokenInput("");
      setClaudeTokenEdit(false);
    } catch (err) {
      setClaudeTokenError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setClaudeTokenBusy(false);
    }
  }

  async function onboardTenant() {
    const handle = tenantHandle.trim().toLowerCase();
    const name = tenantName.trim();
    if (!handle || !name) return;
    setTenantBusy(true);
    setTenantError(null);
    try {
      const result = await api.createAccount({
        accountName: name,
        accountHandle: handle,
        plan: tenantPlan,
        keyScope: "admin",
      });
      setTenantModal(false);
      setTenantHandle("");
      setTenantName("");
      setTenantPlan("hobby");
      setNewTenant({ account: result.account, rawKey: result.rawKey });
    } catch (err) {
      setTenantError(err instanceof Error ? err.message : "Failed to onboard");
    } finally {
      setTenantBusy(false);
    }
  }

  async function createKey() {
    const name = keyName.trim();
    if (!name) return;

    if (liveMode) {
      setCreating(true);
      try {
        const { key, rawKey } = await api.createApiKey({
          name,
          scope: keyScope,
        });
        setKeys((prev) => [
          {
            id: key.id,
            name: key.name,
            preview: `${key.prefix}••••${key.id.slice(-4)}`,
            created: formatCreated(key.createdAt),
            lastUsed: "never",
            scope: key.scope,
          },
          ...prev,
        ]);
        setKeyName("");
        setKeyModal(false);
        setNewRawKey(rawKey);
      } finally {
        setCreating(false);
      }
      return;
    }

    // Offline fallback — local-only mock
    setKeys((prev) => [
      {
        name,
        preview: `ct_live_••••••••••${randomSuffix()}`,
        created: "May 2026",
        lastUsed: "never",
        scope: keyScope,
      },
      ...prev,
    ]);
    setKeyName("");
    setKeyModal(false);
  }

  async function revokeKey(key: ApiKey) {
    if (liveMode && key.id) {
      try {
        await api.revokeApiKey(key.id);
      } catch {
        // Surfaced as no-op if the upstream call fails.
      }
    }
    setKeys((prev) => prev.filter((k) => k.name !== key.name));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        lead="Workspace identity, the Claude bridge, API keys and security."
      />

      {/* workspace — live Account row from /v1/accounts/me when available */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="kv text-ink-dim flex items-center gap-2">
            Workspace
            {liveMode === true && account && (
              <span className="inline-flex items-center gap-1 rounded border border-live/30 bg-live/5 px-1.5 py-0.5 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> live
              </span>
            )}
            {liveMode === true && !account && (
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-faint">
                no Account row · using fallback
              </span>
            )}
            {liveMode === false && (
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-faint">
                offline · mock
              </span>
            )}
          </h2>
          {canOnboardTenant && (
            <button
              onClick={() => setTenantModal(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
            >
              <Building2 className="h-3.5 w-3.5" />
              Onboard tenant
            </button>
          )}
        </div>
        <div className="panel grid gap-5 p-5 sm:grid-cols-2">
          {[
            {
              k: "Organisation",
              v: account?.name ?? ACCOUNT.org,
            },
            {
              k: "Handle",
              v: `@${account?.handle ?? ACCOUNT.handle}`,
            },
            {
              k: "Account ID",
              v: account?.id ?? "—",
            },
            {
              k: "Plan",
              v: `${account?.plan ?? ACCOUNT.plan} · monthly`,
            },
          ].map((f) => (
            <label key={f.k} className="block">
              <span className="kv">{f.k}</span>
              <div className="mt-1.5 flex h-9 items-center rounded-lg border border-border bg-bg px-3 font-mono text-sm text-ink-dim">
                {f.v}
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* identity — who is the Console actually authenticated as */}
      {liveMode === true && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Identity</h2>
          <div className="panel flex items-center gap-3.5 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
              <UserCog className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              {me?.authenticated ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <span className="font-medium">{me.keyName}</span>
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">
                      {me.scope}
                    </span>
                  </div>
                  <div className="truncate font-mono text-2xs text-ink-faint">
                    {me.prefix}… · acting on {me.accountId}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-ink">Not authenticated</div>
                  <div className="text-2xs text-ink-faint">
                    The proxy is forwarding without a Bearer key. Create an
                    API key below, then set <code className="font-mono">CANTILA_API_KEY</code>{" "}
                    in <code className="font-mono">cantila-console/.env.local</code>.
                  </div>
                </>
              )}
            </div>
            {me?.authenticated && (
              <Pill tone="live">
                <Check className="h-3 w-3" />
                Authed
              </Pill>
            )}
          </div>
        </section>
      )}

      {/* your profile — the signed-in user (session callers only) */}
      {liveMode === true && me?.authenticated && me.user && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Your profile</h2>
          <div className="panel flex items-center gap-3.5 p-5">
            <Avatar
              url={me.user.avatarUrl}
              name={me.user.name || me.user.email}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">
                {me.user.name}
              </div>
              <div className="truncate font-mono text-2xs text-ink-faint">
                {me.user.email}
              </div>
            </div>
            {me.user.emailVerifiedAt ? (
              <Pill tone="live">
                <Check className="h-3 w-3" />
                Verified
              </Pill>
            ) : (
              <Pill tone="neutral">Unverified</Pill>
            )}
          </div>
        </section>
      )}

      {/* white-label / reseller — sub-accounts (plan §5.5) */}
      {liveMode === true && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="kv text-ink-dim flex items-center gap-2">
              Sub-accounts
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-faint">
                white-label · plan §5.5
              </span>
            </h2>
            {canMintSubAccount && (
              <button
                onClick={() => setSubModal(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
              >
                <Building2 className="h-3.5 w-3.5" />
                Mint sub-account
              </button>
            )}
          </div>
          {newSub && (
            <div className="panel mb-3 border-ember/30 bg-ember/[0.04] p-4 ring-1 ring-ember/40">
              <div className="text-2xs font-medium text-ember">
                Sub-account {newSub.account.name} (@{newSub.account.handle})
                provisioned — copy the admin key now, this is the only time
                it&apos;s shown.
              </div>
              <code className="mt-2 block select-all break-all rounded-md border border-border-soft bg-surface px-3 py-2 font-mono text-xs text-ember">
                {newSub.rawKey}
              </code>
              <button
                onClick={() => setNewSub(null)}
                className="mt-2 text-2xs text-ink-faint hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          )}
          {!canMintSubAccount && account && !account.parentAccountId && (
            <div className="panel p-4 text-2xs text-ink-faint">
              Your current plan ({account.plan}) doesn&apos;t include
              sub-accounts. Upgrade to <span className="text-ink">agency</span>{" "}
              or <span className="text-ink">dedicated</span> to white-label
              client tenants under your workspace.
            </div>
          )}
          {account?.parentAccountId && (
            <div className="panel p-4 text-2xs text-ink-faint">
              This workspace is itself a sub-account under{" "}
              <code className="kv">{account.parentAccountId}</code>. Two-level
              hierarchy only in v1 — sub-accounts can&apos;t create their own
              sub-accounts.
            </div>
          )}
          {canMintSubAccount && subAccounts.length === 0 && !newSub && (
            <div className="panel p-4 text-2xs text-ink-faint">
              No sub-accounts yet. Mint one to provision a client tenant — they
              get their own projects, mailboxes and numbers, billed and
              isolated, and you can act on it from this workspace.
            </div>
          )}
          {subAccounts.length > 0 && (
            <div className="panel overflow-hidden p-0">
              <table className="w-full text-2xs">
                <thead className="bg-surface-2 text-ink-dim">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">Handle</th>
                    <th className="px-4 py-2 text-left font-medium">Plan</th>
                    <th className="px-4 py-2 text-left font-medium">Billing</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {subAccounts.map((a) => {
                    const rolledUp = !!a.billedToAccountId;
                    return (
                      <tr key={a.id}>
                        <td className="px-4 py-2 font-medium text-ink">
                          {a.name}
                          <div className="font-mono text-ink-faint">{a.id}</div>
                        </td>
                        <td className="px-4 py-2 text-ink-dim">@{a.handle}</td>
                        <td className="px-4 py-2 text-ink-dim">{a.plan}</td>
                        <td className="px-4 py-2">
                          {rolledUp ? (
                            <Pill tone="ember">on your bill</Pill>
                          ) : (
                            <Pill tone="neutral">self-paid</Pill>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => toggleRollup(a)}
                            disabled={rollupBusyId === a.id}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
                          >
                            {rollupBusyId === a.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : null}
                            {rolledUp ? "Remove from bill" : "Roll onto bill"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rollupError && (
            <div className="mt-2 text-2xs text-down">{rollupError}</div>
          )}
          {subError && (
            <div className="mt-2 text-2xs text-down">{subError}</div>
          )}
        </section>
      )}

      {/* white-label / per-account branding (plan §5.5) */}
      {liveMode === true && account && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="kv text-ink-dim flex items-center gap-2">
              Branding
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-faint">
                white-label · plan §5.5
              </span>
            </h2>
            {brandSavedAt && Date.now() - brandSavedAt < 3000 && (
              <Pill tone="live">
                <Check className="h-3 w-3" />
                Saved
              </Pill>
            )}
          </div>
          <div className="panel grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Display name
              </label>
              <input
                type="text"
                value={brandDisplay}
                onChange={(e) => setBrandDisplay(e.target.value)}
                placeholder={account.name}
                className={inputClass}
              />
              <p className="mt-1 text-2xs text-ink-faint">
                Shown in the sidebar &amp; topbar instead of the legal name.
              </p>
            </div>
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Logo URL
              </label>
              <input
                type="url"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                placeholder="https://…/logo.svg"
                className={inputClass}
              />
              <p className="mt-1 text-2xs text-ink-faint">
                SVG or PNG, served over HTTPS. Replaces the sidebar diamond.
              </p>
            </div>
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Primary colour
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={brandPrimary}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                  placeholder="#ff7a18"
                  className={inputClass}
                />
                <span
                  className="h-9 w-9 shrink-0 rounded-lg border border-border-soft"
                  style={{
                    backgroundColor: brandPrimary || "transparent",
                  }}
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                Accent colour
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={brandAccent}
                  onChange={(e) => setBrandAccent(e.target.value)}
                  placeholder="#fbbf24"
                  className={inputClass}
                />
                <span
                  className="h-9 w-9 shrink-0 rounded-lg border border-border-soft"
                  style={{
                    backgroundColor: brandAccent || "transparent",
                  }}
                  aria-hidden
                />
              </div>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between border-t border-border-soft pt-3">
              <p className="text-2xs text-ink-faint">
                {account.parentAccountId
                  ? "Your agency parent can also edit these fields."
                  : "Applies to this workspace and any sub-accounts that haven't overridden it."}
              </p>
              <Button onClick={submitBranding} disabled={brandBusy}>
                {brandBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save branding
              </Button>
            </div>
            {brandError && (
              <div className="sm:col-span-2 text-2xs text-down">
                {brandError}
              </div>
            )}
          </div>
        </section>
      )}

      {/* the Claude bridge */}
      <section>
        <h2 className="kv mb-3 text-ember">Cantila + Claude</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel relative overflow-hidden p-5">
            <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-20" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-ember">
                    <Plug className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-ink">
                      Cantila MCP server
                    </h3>
                    <p className="text-2xs text-ink-faint">
                      Ship to Cantila from any Claude surface
                    </p>
                  </div>
                </div>
                <Pill tone="live">
                  <span className="h-1.5 w-1.5 rounded-full bg-live" />
                  Connected
                </Pill>
              </div>

              <p className="mt-3 text-2xs leading-relaxed text-ink-dim">
                Add this remote MCP server to Claude Code, the Claude app or
                Cowork. Then any app built in Claude deploys here by just
                asking.
              </p>

              <div className="mt-3">
                <CopyField value="https://mcp.cantila.app/v1/mcp" />
              </div>

              <p className="mt-2 text-2xs leading-relaxed text-ink-dim">
                Authenticate with a Cantila API key — send it as{" "}
                <span className="font-mono">Authorization: Bearer ctk_…</span>.
                Create one under API keys.
              </p>

              <div className="mt-3.5">
                <div className="kv mb-1.5">Exposed tools</div>
                <div className="flex flex-wrap gap-1.5">
                  {MCP_TOOLS.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-2xs text-ink-dim"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="panel flex flex-col p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-ember">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Your Anthropic API key
                  </h3>
                  <p className="text-2xs text-ink-faint">
                    Run AI analyses on your own Claude account
                  </p>
                </div>
              </div>
              {account?.anthropicApiKey ? (
                <Pill tone="live">
                  <Check className="h-3 w-3" />
                  Configured
                </Pill>
              ) : (
                <Pill tone="neutral">Using platform default</Pill>
              )}
            </div>

            <p className="mt-3 text-2xs leading-relaxed text-ink-dim">
              When set, Cantila uses <strong>your</strong> key for AI
              troubleshooting and cost-optimiser suggestions on this account
              — model spend is billed to your Anthropic account, not
              Cantila&apos;s. Without a key, the platform-default analyser
              runs.
            </p>

            {account?.anthropicApiKey && !anthropicEdit ? (
              <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-3">
                  <KeyRound className="h-3.5 w-3.5 text-ink-dim" />
                </span>
                <div className="min-w-0 flex-1">
                  <code className="truncate font-mono text-xs text-ink">
                    {account.anthropicApiKey}
                  </code>
                  <div className="text-2xs text-ink-faint">
                    Stored · spend billed to your Anthropic account
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <input
                  value={anthropicInput}
                  onChange={(e) => setAnthropicInput(e.target.value)}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-ant-api03-..."
                  className={inputClass}
                  disabled={anthropicBusy}
                />
                {anthropicError && (
                  <p className="text-2xs text-down">{anthropicError}</p>
                )}
              </div>
            )}

            <div className="mt-auto flex gap-2 pt-3.5">
              {account?.anthropicApiKey && !anthropicEdit ? (
                <>
                  <button
                    onClick={() => {
                      setAnthropicEdit(true);
                      setAnthropicError(null);
                    }}
                    disabled={anthropicBusy}
                    className="h-8 flex-1 rounded-lg border border-border bg-surface-2 text-2xs font-medium text-ink-dim hover:text-ink disabled:opacity-50"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => void removeAnthropicKey()}
                    disabled={anthropicBusy}
                    className="h-8 flex-1 rounded-lg border border-down/30 bg-down/10 text-2xs font-medium text-down hover:bg-down/20 disabled:opacity-50"
                  >
                    {anthropicBusy ? (
                      <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </button>
                </>
              ) : (
                <>
                  {account?.anthropicApiKey && (
                    <button
                      onClick={() => {
                        setAnthropicEdit(false);
                        setAnthropicInput("");
                        setAnthropicError(null);
                      }}
                      disabled={anthropicBusy}
                      className="h-8 flex-1 rounded-lg border border-border bg-surface-2 text-2xs font-medium text-ink-dim hover:text-ink"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => void saveAnthropicKey()}
                    disabled={anthropicBusy || anthropicInput.length < 20}
                    className="h-8 flex-1 rounded-lg bg-ember text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:opacity-50"
                  >
                    {anthropicBusy ? (
                      <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                    ) : account?.anthropicApiKey ? (
                      "Save new key"
                    ) : (
                      "Save key"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Connect claude.ai subscription card */}
          <div className="panel flex flex-col p-5 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-ember">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Connect your claude.ai subscription
                  </h3>
                  <p className="text-2xs text-ink-faint">
                    Run the build fleet on your own Claude subscription quota
                  </p>
                </div>
              </div>
              {account?.claudeSubscriptionToken ? (
                <Pill tone="live">
                  <Check className="h-3 w-3" />
                  Connected
                </Pill>
              ) : (
                <Pill tone="neutral">Using platform default</Pill>
              )}
            </div>

            <p className="mt-3 text-2xs leading-relaxed text-ink-dim">
              When connected, every build and chat in this workspace runs on{" "}
              <strong>your</strong> claude.ai subscription — AI build spend comes
              off your quota, not Cantila&apos;s platform bill. Copy{" "}
              <code className="font-mono">CLAUDE_CODE_OAUTH_TOKEN</code> from{" "}
              <code className="font-mono">~/.claude/credentials.json</code>{" "}
              (Windows: <code className="font-mono">%APPDATA%\Claude\credentials.json</code>)
              and paste it below.
            </p>

            {account?.claudeSubscriptionToken && !claudeTokenEdit ? (
              <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-3">
                  <KeyRound className="h-3.5 w-3.5 text-ink-dim" />
                </span>
                <div className="min-w-0 flex-1">
                  <code className="truncate font-mono text-xs text-ink">
                    {account.claudeSubscriptionToken}
                  </code>
                  <div className="text-2xs text-ink-faint">
                    Connected · build fleet uses your subscription
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <input
                  value={claudeTokenInput}
                  onChange={(e) => setClaudeTokenInput(e.target.value)}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Paste CLAUDE_CODE_OAUTH_TOKEN here…"
                  className={inputClass}
                  disabled={claudeTokenBusy}
                />
                {claudeTokenError && (
                  <p className="text-2xs text-down">{claudeTokenError}</p>
                )}
              </div>
            )}

            <div className="mt-auto flex gap-2 pt-3.5">
              {account?.claudeSubscriptionToken && !claudeTokenEdit ? (
                <>
                  <button
                    onClick={() => {
                      setClaudeTokenEdit(true);
                      setClaudeTokenError(null);
                    }}
                    disabled={claudeTokenBusy}
                    className="h-8 flex-1 rounded-lg border border-border bg-surface-2 text-2xs font-medium text-ink-dim hover:text-ink disabled:opacity-50"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => void removeClaudeToken()}
                    disabled={claudeTokenBusy}
                    className="h-8 flex-1 rounded-lg border border-down/30 bg-down/10 text-2xs font-medium text-down hover:bg-down/20 disabled:opacity-50"
                  >
                    {claudeTokenBusy ? (
                      <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </button>
                </>
              ) : (
                <>
                  {account?.claudeSubscriptionToken && (
                    <button
                      onClick={() => {
                        setClaudeTokenEdit(false);
                        setClaudeTokenInput("");
                        setClaudeTokenError(null);
                      }}
                      disabled={claudeTokenBusy}
                      className="h-8 flex-1 rounded-lg border border-border bg-surface-2 text-2xs font-medium text-ink-dim hover:text-ink"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => void saveClaudeToken()}
                    disabled={claudeTokenBusy || claudeTokenInput.length < 20}
                    className="h-8 flex-1 rounded-lg bg-ember text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:opacity-50"
                  >
                    {claudeTokenBusy ? (
                      <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                    ) : account?.claudeSubscriptionToken ? (
                      "Save new token"
                    ) : (
                      "Connect"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* API keys */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="kv text-ink-dim flex items-center gap-2">
            API keys · {keys.length}
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded border border-live/30 bg-live/5 px-1.5 py-0.5 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> live
              </span>
            )}
            {liveMode === false && (
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-faint">
                offline · mock
              </span>
            )}
          </h2>
          <button
            onClick={() => setKeyModal(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
          >
            <Plus className="h-3.5 w-3.5" />
            New key
          </button>
        </div>
        <div className="panel overflow-hidden p-0">
          {keys.length > 0 ? (
            <div className="divide-y divide-border-soft">
              {keys.map((k) => (
                <div
                  key={k.id ?? k.name}
                  className="flex items-center gap-3.5 px-5 py-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {k.name}
                      </span>
                      {k.scope && (
                        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">
                          {k.scope}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-2xs text-ink-faint">
                      {k.preview}
                    </div>
                  </div>
                  <span className="hidden font-mono text-2xs text-ink-faint sm:block">
                    used {k.lastUsed}
                  </span>
                  <button
                    onClick={() => revokeKey(k)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint hover:border-down/40 hover:text-down"
                    aria-label={`Revoke ${k.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-ink-faint">
              No API keys. Create one to use the CLI or REST API.
            </div>
          )}
        </div>
      </section>

      {/* security */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Security</h2>
        <div className="panel divide-y divide-border-soft p-0">
          <div className="flex items-center gap-3 px-5 py-4">
            <KeyRound className="h-4 w-4 text-ink-faint" />
            <div className="flex-1">
              <div className="text-sm text-ink">Password</div>
              <div className="text-2xs text-ink-faint">
                {pwSavedAt
                  ? "Updated · keep your new password somewhere safe"
                  : "Used for email + password sign-in at cantila.app/login"}
              </div>
            </div>
            <button
              onClick={() => {
                setPwError(null);
                setPwModal(true);
              }}
              className="text-2xs font-medium text-ember hover:underline"
            >
              Change
            </button>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <ShieldCheck className="h-4 w-4 text-live" />
            <div className="flex-1">
              <div className="text-sm text-ink">Two-factor authentication</div>
              <div className="text-2xs text-ink-faint">
                Authenticator app · enabled
              </div>
            </div>
            <Pill tone="live">
              <Check className="h-3 w-3" />
              On
            </Pill>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <KeyRound className="h-4 w-4 text-ink-faint" />
            <div className="flex-1">
              <div className="text-sm text-ink">Active sessions</div>
              <div className="text-2xs text-ink-faint">
                2 devices · macOS · iOS
              </div>
            </div>
            <button className="text-2xs font-medium text-ink-dim hover:text-ink">
              Manage
            </button>
          </div>
        </div>
      </section>

      {/* new API key modal */}
      <Modal
        open={keyModal}
        onClose={() => setKeyModal(false)}
        title="Create API key"
        description="Scoped to this workspace. Store it somewhere safe."
        footer={
          <>
            <Button variant="ghost" onClick={() => setKeyModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createKey}
              disabled={!keyName.trim() || creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" strokeWidth={2.4} />
              )}
              Generate key
            </Button>
          </>
        }
      >
        <Field label="Key name" hint="A label so you can recognise it later.">
          <input
            autoFocus
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createKey();
            }}
            placeholder="staging-deploy"
            className={inputClass}
          />
        </Field>
        <Field label="Scope" hint="Read = list/get only; deploy = ship & manage; admin = everything including keys.">
          <select
            value={keyScope}
            onChange={(e) =>
              setKeyScope(e.target.value as "read" | "deploy" | "admin")
            }
            className={inputClass}
          >
            <option value="read">read</option>
            <option value="deploy">deploy</option>
            <option value="admin">admin</option>
          </select>
        </Field>
      </Modal>

      {/* one-time reveal of the newly created raw key */}
      <Modal
        open={newRawKey !== null}
        onClose={() => setNewRawKey(null)}
        title="Copy your new API key"
        description="This is the only time the full key will be shown. Store it somewhere safe."
        footer={
          <Button variant="primary" onClick={() => setNewRawKey(null)}>
            <Check className="h-4 w-4" strokeWidth={2.4} />
            I have it
          </Button>
        }
      >
        {newRawKey && <CopyField value={newRawKey} />}
        <p className="text-2xs text-ink-faint">
          Use it with the CLI:{" "}
          <code className="font-mono">cantila config set apiKey=…</code>{" "}
          or as an{" "}
          <code className="font-mono">Authorization: Bearer …</code> header.
        </p>
      </Modal>

      {/* onboard a new tenant (admin-only) */}
      <Modal
        open={tenantModal}
        onClose={() => setTenantModal(false)}
        title="Onboard a new tenant"
        description="Provisions a fresh Account row plus its first admin API key. The new tenant is fully isolated from this one."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTenantModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onboardTenant}
              disabled={!tenantHandle.trim() || !tenantName.trim() || tenantBusy}
            >
              {tenantBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" strokeWidth={2.4} />
              )}
              Provision tenant
            </Button>
          </>
        }
      >
        <Field label="Organisation name" hint="Shown in the Console header.">
          <input
            autoFocus
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Acme Inc"
            className={inputClass}
          />
        </Field>
        <Field
          label="Handle"
          hint="URL-safe, 3–40 chars, lowercase letters/digits/hyphens. Determines the Account ID (acc_<handle>)."
        >
          <input
            value={tenantHandle}
            onChange={(e) => setTenantHandle(e.target.value)}
            placeholder="acme"
            className={inputClass}
          />
        </Field>
        <Field label="Plan">
          <select
            value={tenantPlan}
            onChange={(e) => setTenantPlan(e.target.value as ApiAccountPlan)}
            className={inputClass}
          >
            <option value="hobby">hobby</option>
            <option value="starter">starter</option>
            <option value="pro">pro</option>
            <option value="agency">agency</option>
            <option value="dedicated">dedicated</option>
          </select>
        </Field>
        {tenantError && (
          <p className="rounded border border-down/30 bg-down/10 px-3 py-2 text-2xs text-down">
            {tenantError}
          </p>
        )}
      </Modal>

      {/* white-label sub-account create modal (plan §5.5) */}
      <Modal
        open={subModal}
        onClose={() => setSubModal(false)}
        title="Mint a sub-account"
        description="A fully-isolated tenant under this workspace. They get their own projects, mailboxes and numbers; you can act on it from here as the agency parent."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submitSubAccount}
              disabled={!subHandle.trim() || !subName.trim() || subBusy}
            >
              {subBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" strokeWidth={2.4} />
              )}
              Mint sub-account
            </Button>
          </>
        }
      >
        <Field label="Client name" hint="Shown in the Console header for this sub-account.">
          <input
            autoFocus
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="Client Co"
            className={inputClass}
          />
        </Field>
        <Field
          label="Handle"
          hint="URL-safe, 3–40 chars. Becomes the sub-account's ID (acc_<handle>)."
        >
          <input
            value={subHandle}
            onChange={(e) => setSubHandle(e.target.value)}
            placeholder="client-co"
            className={inputClass}
          />
        </Field>
        <Field label="Plan">
          <select
            value={subPlan}
            onChange={(e) => setSubPlan(e.target.value as ApiAccountPlan)}
            className={inputClass}
          >
            <option value="hobby">hobby</option>
            <option value="starter">starter</option>
            <option value="pro">pro</option>
          </select>
        </Field>
        {subError && (
          <p className="rounded border border-down/30 bg-down/10 px-3 py-2 text-2xs text-down">
            {subError}
          </p>
        )}
      </Modal>

      {/* one-time reveal of the new tenant's bootstrap admin key */}
      <Modal
        open={newTenant !== null}
        onClose={() => setNewTenant(null)}
        title={
          newTenant ? `Tenant "${newTenant.account.name}" provisioned` : "Tenant provisioned"
        }
        description="This is the only time the bootstrap admin key will be shown. Hand it to the tenant's operator."
        footer={
          <Button variant="primary" onClick={() => setNewTenant(null)}>
            <Check className="h-4 w-4" strokeWidth={2.4} />
            I have it
          </Button>
        }
      >
        {newTenant && (
          <>
            <div className="mb-3 rounded-lg border border-border bg-surface-2 p-3 text-2xs text-ink-dim">
              <div className="font-mono">id: {newTenant.account.id}</div>
              <div className="font-mono">handle: @{newTenant.account.handle}</div>
              <div className="font-mono">plan: {newTenant.account.plan}</div>
            </div>
            <CopyField value={newTenant.rawKey} />
            <p className="mt-3 text-2xs text-ink-faint">
              The tenant operator can persist this with{" "}
              <code className="font-mono">
                cantila config set apiKey={"<key>"} accountId={newTenant.account.id}
              </code>
              .
            </p>
          </>
        )}
      </Modal>

      {/* change password modal (plan §5.4) */}
      <Modal
        open={pwModal}
        onClose={() => {
          setPwModal(false);
          setPwError(null);
        }}
        title="Change password"
        description="The control plane verifies your current password before storing the new hash."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPwModal(false);
                setPwError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submitChangePassword}
              disabled={
                pwBusy ||
                pwCurrent.length === 0 ||
                pwNew.length < 8 ||
                pwConfirm.length === 0
              }
            >
              {pwBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" strokeWidth={2.4} />
              )}
              Update password
            </Button>
          </>
        }
      >
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            autoComplete="new-password"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitChangePassword();
            }}
            className={inputClass}
          />
        </Field>
        {pwError && (
          <p className="rounded-md border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
            {pwError}
          </p>
        )}
      </Modal>
    </div>
  );
}
