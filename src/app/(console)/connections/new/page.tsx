"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Plus,
  ChevronLeft,
  Plug,
} from "lucide-react";
import { PageHeader, cx } from "@/components/ui";
import {
  api,
  isControlPlaneLive,
  type ApiProviderDescriptor,
} from "@/lib/api";

/** Server-side fallback catalog — mirrors the Phase A control-plane list
 *  so the page renders offline. Replaced by `/v1/connections/providers`
 *  when the control plane is reachable. */
const FALLBACK_PROVIDERS: ApiProviderDescriptor[] = [
  {
    id: "openai",
    name: "OpenAI",
    blurb: "GPT-4, embeddings, image generation.",
    glyph: "AI",
    authKinds: ["api_key"],
    apiKey: {
      fields: [
        { key: "api_key", label: "API key", secret: true, hint: "Starts with `sk-`." },
      ],
    },
  },
  {
    id: "anthropic",
    name: "Anthropic",
    blurb: "Claude — sonnet, opus, haiku.",
    glyph: "Λ",
    authKinds: ["api_key"],
    apiKey: {
      fields: [
        {
          key: "api_key",
          label: "API key",
          secret: true,
          hint: "Starts with `sk-ant-`.",
        },
      ],
    },
  },
  {
    id: "stripe",
    name: "Stripe",
    blurb: "Payments, subscriptions, billing.",
    glyph: "S",
    authKinds: ["api_key"],
    apiKey: {
      fields: [
        {
          key: "api_key",
          label: "Secret key",
          secret: true,
          hint: "`sk_live_…` or `sk_test_…`.",
        },
      ],
    },
  },
  {
    id: "http_basic",
    name: "HTTP Basic Auth",
    blurb: "Username + password for any HTTP API.",
    glyph: "🔑",
    authKinds: ["basic"],
    apiKey: {
      fields: [
        { key: "username", label: "Username", secret: false },
        { key: "password", label: "Password", secret: true },
      ],
    },
  },
  {
    id: "generic_api_key",
    name: "Generic API Key",
    blurb: "Any service with a single API-key header.",
    glyph: "·",
    authKinds: ["api_key"],
    apiKey: {
      fields: [
        { key: "header_name", label: "Header name", secret: false },
        { key: "api_key", label: "API key", secret: true },
      ],
    },
  },
];

export default function NewConnectionPage() {
  const router = useRouter();
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [providers, setProviders] =
    useState<ApiProviderDescriptor[]>(FALLBACK_PROVIDERS);
  const [chosen, setChosen] = useState<ApiProviderDescriptor | null>(null);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isControlPlaneLive().then(async (ok) => {
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        const { providers } = await api.listProviders();
        if (!cancelled && providers.length) setProviders(providers);
      } catch {
        /* swallow — fall through to FALLBACK_PROVIDERS */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isOAuth = Boolean(chosen?.oauth);

  async function submit() {
    if (!chosen) return;
    if (!name.trim()) {
      setError("name is required");
      return;
    }

    setBusy(true);
    setError(null);

    if (isOAuth) {
      // OAuth flow — the control plane mints a one-time state and an
      // authorize URL; we redirect the browser to the provider, the
      // callback handles the token exchange and bounces back to
      // /connections.
      if (!liveMode) {
        setError("OAuth requires a live control plane.");
        setBusy(false);
        return;
      }
      try {
        const { authorizeUrl } = await api.startOAuth({
          provider: chosen.id,
          name: name.trim(),
          returnTo: "/connections",
        });
        window.location.href = authorizeUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : "OAuth start failed");
        setBusy(false);
      }
      return;
    }

    // API-key / basic flow.
    const missing = chosen.apiKey?.fields.find(
      (f) => !fields[f.key]?.trim(),
    );
    if (missing) {
      setError(`missing field: ${missing.label}`);
      setBusy(false);
      return;
    }
    try {
      if (liveMode) {
        await api.createConnection({
          provider: chosen.id,
          name: name.trim(),
          fields,
        });
      }
      router.push("/connections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
      setBusy(false);
    }
  }

  if (!chosen) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Connections"
          title="Add a connection"
          lead="Pick a provider. Cantila handles the credential — every workflow node in every automation can reuse it."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setChosen(p);
                // Pre-seed the name with the provider so users can just hit
                // Submit on the simple case.
                if (!name) setName(p.name);
              }}
              className="panel group flex flex-col items-start gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ember/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface-3 to-surface-2 font-display text-lg font-bold text-ember">
                  {p.glyph}
                </span>
                <div>
                  <div className="font-display text-base font-semibold text-ink">
                    {p.name}
                  </div>
                  <div className="text-2xs text-ink-faint">
                    {p.oauth
                      ? "OAuth"
                      : p.apiKey?.fields.length === 1
                        ? "API key"
                        : `${p.apiKey?.fields.length ?? 0} fields`}
                  </div>
                </div>
              </div>
              <p className="text-2xs text-ink-dim">{p.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => {
          setChosen(null);
          setFields({});
          setError(null);
        }}
        className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-dim hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        back to providers
      </button>
      <PageHeader
        eyebrow="Add a connection"
        title={`Connect ${chosen.name}`}
        lead={chosen.blurb}
      />

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <section className="panel space-y-4 p-5">
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Label
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. JJ — OpenAI"
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ember focus:ring-1 focus:ring-ember/30"
            autoFocus
          />
        </label>

        {isOAuth ? (
          <div className="rounded-md border border-border-soft bg-surface-2 px-3 py-3 text-2xs text-ink-dim">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
              OAuth handshake
            </div>
            <p className="mt-1">
              Continuing sends you to {chosen.name} to authorise Cantila.
              Cantila stores only the access &amp; refresh tokens, never
              your username or password.
            </p>
            {chosen.oauth && chosen.oauth.scopes.length > 0 && (
              <p className="mt-2 break-words font-mono text-[0.65rem] text-ink-faint">
                Scopes: {chosen.oauth.scopes.join(", ")}
              </p>
            )}
          </div>
        ) : (
          chosen.apiKey?.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
                {f.label}
              </span>
              <input
                type={f.secret ? "password" : "text"}
                value={fields[f.key] ?? ""}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className={cx(
                  "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ember focus:ring-1 focus:ring-ember/30",
                  f.secret && "font-mono",
                )}
              />
              {f.hint && (
                <span className="mt-1 block text-2xs text-ink-faint">{f.hint}</span>
              )}
            </label>
          ))
        )}
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-ink-dim hover:bg-surface-3 hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.4} />
          )}
          {isOAuth ? `Continue to ${chosen.name}` : "Add connection"}
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-2xs text-ink-faint">
        <Plug className="h-3 w-3" />
        Cantila stores the credential in its secrets manager and only ever
        injects it into a workflow at run time.
      </p>
    </div>
  );
}
