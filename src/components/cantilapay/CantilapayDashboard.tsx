"use client";

/* ============================================================
   Cantilapay — Console dashboard (plan §25, Phase 6).

   Single-page overview of the tenant's cantilapay account:

     - status banner (created / onboarding / active / rejected)
       + "Continue onboarding" CTA when not active
     - adapter probe ("Stripe stub" vs "Adyen for Platforms (test)")
     - API keys panel: list + issue + revoke (test mode shown first)
     - webhook endpoints panel: list + register
     - recent audit log

   Subsequent drops add per-section sub-pages (/cantilapay/payments,
   /subscriptions, etc.) following the same pattern as the existing
   `(console)/billing` surface.
   ============================================================ */

import { useCallback, useEffect, useState } from "react";
import {
  cantilapayApi,
  type CantilapayAccount,
  type CantilapayApiKey,
  type CantilapayApiKeyIssued,
  type CantilapayAuditEntry,
  type CantilapayMode,
  type CantilapayWebhookEndpoint,
} from "@/lib/cantilapay-api";

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

function fmtAmount(amount: number, currency: string): string {
  const major = amount / 100;
  return `${major.toFixed(2)} ${currency.toUpperCase()}`;
}

export default function CantilapayDashboard(): JSX.Element {
  const [state, setState] = useState<State>(INITIAL);

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
          const k = await cantilapayApi.listKeys();
          keys = k.keys;
        } catch {
          /* keep empty */
        }
        try {
          const w = await cantilapayApi.listWebhookEndpoints();
          webhooks = w.endpoints;
        } catch {
          /* keep empty */
        }
        try {
          const a = await cantilapayApi.listAudit(50);
          audit = a.entries;
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
        freshKey: null,
        freshWebhookSecret: null,
        busy: false,
        error: null,
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

  const onEnable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await cantilapayApi.enable("USA");
      await refresh();
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : "enable failed",
      }));
    }
  }, [refresh]);

  const onOnboard = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const link = await cantilapayApi.onboardingLink({
        mode: "test",
        country: state.account?.country ?? "USA",
        returnUrl: `${window.location.origin}/cantilapay?onboarded=1`,
      });
      window.location.assign(link.url);
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : "onboarding failed",
      }));
    }
  }, [state.account]);

  const onIssueKey = useCallback(
    async (kind: "publishable" | "secret", mode: CantilapayMode) => {
      setState((s) => ({ ...s, busy: true, error: null }));
      try {
        const issued = await cantilapayApi.issueKey({
          name: `${mode} ${kind} key`,
          kind,
          mode,
        });
        setState((s) => ({ ...s, freshKey: issued, busy: false }));
        await refresh();
      } catch (err) {
        setState((s) => ({
          ...s,
          busy: false,
          error: err instanceof Error ? err.message : "issue key failed",
        }));
      }
    },
    [refresh],
  );

  const onRevokeKey = useCallback(
    async (id: string) => {
      setState((s) => ({ ...s, busy: true, error: null }));
      try {
        await cantilapayApi.revokeKey(id);
        await refresh();
      } catch (err) {
        setState((s) => ({
          ...s,
          busy: false,
          error: err instanceof Error ? err.message : "revoke failed",
        }));
      }
    },
    [refresh],
  );

  const onAddWebhook = useCallback(async () => {
    const url = window.prompt("Webhook URL (https://...)");
    if (!url) return;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const created = await cantilapayApi.createWebhookEndpoint({
        url,
        mode: "test",
      });
      setState((s) => ({
        ...s,
        freshWebhookSecret: { id: created.id, secret: created.signingSecret },
        busy: false,
      }));
      await refresh();
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : "create webhook failed",
      }));
    }
  }, [refresh]);

  if (state.loading) {
    return (
      <div style={{ padding: "2rem" }}>Loading cantilapay dashboard…</div>
    );
  }

  if (!state.enabled) {
    return (
      <div style={{ maxWidth: 720, margin: "2rem auto", padding: "2rem" }}>
        <h1>Cantilapay</h1>
        <p>
          The 12th Cantila product surface — let your end-users pay you with a
          single API call. Built on Adyen for Platforms (NOT Stripe). Your
          end-customers see your business name on their receipts; you are the
          merchant of record.
        </p>
        {state.adapterLabel && (
          <p style={{ opacity: 0.7 }}>
            Adapter: <strong>{state.adapterLabel}</strong> ({state.adapterLive ? "live" : "stub"})
          </p>
        )}
        {state.error && <p style={{ color: "#c00" }}>{state.error}</p>}
        <button
          onClick={() => void onEnable()}
          disabled={state.busy}
          style={{ marginTop: "1rem" }}
        >
          Enable Cantilapay
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "1rem" }}>
      <h1>Cantilapay</h1>
      <p style={{ opacity: 0.7 }}>
        Adapter: <strong>{state.adapterLabel ?? "?"}</strong>
        {state.adapterLive ? " (live)" : " (stub)"}
      </p>

      {state.error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #c33",
            padding: "0.75rem",
            borderRadius: 4,
            marginBottom: "1rem",
          }}
        >
          {state.error}
        </div>
      )}

      {/* Status banner */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Account status</h2>
        <p>
          <strong>{state.account?.status}</strong>
          {state.account?.testReady ? " · test ready" : ""}
          {state.account?.liveReady ? " · live ready" : ""}
          {" · platform fee "}
          {((state.account?.platformFeeBps ?? 0) / 100).toFixed(2)}%
        </p>
        {state.account?.status !== "active" && (
          <button onClick={() => void onOnboard()} disabled={state.busy}>
            Continue onboarding (test mode)
          </button>
        )}
      </section>

      {/* Fresh key */}
      {state.freshKey && (
        <section
          style={{
            background: "#efd",
            border: "1px solid #2a2",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>New API key — shown once</h2>
          <p>
            Save this key now. It will never be shown again — only the
            prefix <code>{state.freshKey.prefix}</code> will be visible later.
          </p>
          <pre
            style={{
              background: "#fff",
              padding: "0.75rem",
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            {state.freshKey.rawKey}
          </pre>
        </section>
      )}

      {/* Fresh webhook secret */}
      {state.freshWebhookSecret && (
        <section
          style={{
            background: "#efd",
            border: "1px solid #2a2",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>New webhook signing secret — shown once</h2>
          <p>
            Save this secret. Your server uses it to verify the
            <code> Cantilapay-Signature </code> header on every delivery.
          </p>
          <pre
            style={{
              background: "#fff",
              padding: "0.75rem",
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            {state.freshWebhookSecret.secret}
          </pre>
        </section>
      )}

      {/* API keys */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>API keys</h2>
        <div style={{ marginBottom: "1rem" }}>
          <button onClick={() => void onIssueKey("publishable", "test")} disabled={state.busy}>
            New publishable test key
          </button>{" "}
          <button onClick={() => void onIssueKey("secret", "test")} disabled={state.busy}>
            New secret test key
          </button>{" "}
          <button onClick={() => void onIssueKey("publishable", "live")} disabled={state.busy}>
            New publishable live key
          </button>{" "}
          <button onClick={() => void onIssueKey("secret", "live")} disabled={state.busy}>
            New secret live key
          </button>
        </div>
        {state.keys.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No keys yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Name</th>
                <th style={{ textAlign: "left" }}>Kind</th>
                <th style={{ textAlign: "left" }}>Mode</th>
                <th style={{ textAlign: "left" }}>Prefix</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.keys.map((k) => (
                <tr key={k.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{k.name}</td>
                  <td>{k.kind}</td>
                  <td>{k.mode}</td>
                  <td>
                    <code>{k.prefix}…</code>
                  </td>
                  <td>{k.revokedAt ? "revoked" : "active"}</td>
                  <td>{k.createdAt.slice(0, 10)}</td>
                  <td>
                    {!k.revokedAt && (
                      <button
                        onClick={() => void onRevokeKey(k.id)}
                        disabled={state.busy}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Webhook endpoints */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Webhook endpoints</h2>
        <div style={{ marginBottom: "1rem" }}>
          <button onClick={() => void onAddWebhook()} disabled={state.busy}>
            Register webhook URL
          </button>
        </div>
        {state.webhooks.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No webhook endpoints yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>URL</th>
                <th style={{ textAlign: "left" }}>Mode</th>
                <th style={{ textAlign: "left" }}>Events</th>
                <th style={{ textAlign: "left" }}>Secret</th>
                <th style={{ textAlign: "left" }}>Last delivery</th>
              </tr>
            </thead>
            <tbody>
              {state.webhooks.map((w) => (
                <tr key={w.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{w.url}</td>
                  <td>{w.mode}</td>
                  <td>{w.enabledEvents}</td>
                  <td>
                    <code>{w.signingSecretPrefix}…</code>
                  </td>
                  <td>{w.lastDeliveryAt?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Audit */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Recent activity</h2>
        {state.audit.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No activity yet.</p>
        ) : (
          <ul>
            {state.audit.slice(0, 25).map((e) => (
              <li key={e.id}>
                <code>{e.type}</code> — {e.message}{" "}
                <span style={{ opacity: 0.6 }}>({e.createdAt.slice(0, 10)})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p style={{ opacity: 0.6, marginTop: "2rem", fontSize: 12 }}>
        This page is the Phase 6.0 dashboard surface. Per-section pages
        (/payments, /subscriptions, /customers, /payouts, /webhooks/:id,
        /products) ship as Phase 6.1+. See plan §25.
      </p>
    </div>
  );
}
