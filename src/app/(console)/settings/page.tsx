import {
  Plug,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader, Pill } from "@/components/ui";
import { CopyField } from "@/components/CopyButton";
import { BrandMark } from "@/components/Sidebar";
import { ACCOUNT } from "@/lib/mock-data";

export const metadata = { title: "Settings · Cantila Console" };

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

const API_KEYS = [
  { name: "production-ci", preview: "ct_live_••••••••••a91f", created: "Mar 2026", lastUsed: "2h ago" },
  { name: "local-cli", preview: "ct_live_••••••••••3d7c", created: "Apr 2026", lastUsed: "5d ago" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        lead="Workspace identity, the Claude bridge, API keys and security."
      />

      {/* account */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Workspace</h2>
        <div className="panel grid gap-5 p-5 sm:grid-cols-2">
          {[
            { k: "Organisation", v: ACCOUNT.org },
            { k: "Handle", v: `@${ACCOUNT.handle}` },
            { k: "Email", v: ACCOUNT.email },
            { k: "Plan", v: `${ACCOUNT.plan} · monthly` },
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

      {/* the Claude bridge */}
      <section>
        <h2 className="kv mb-3 text-ember">Cantila + Claude</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* MCP server */}
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
                <CopyField value="https://mcp.cantila.app/v1" />
              </div>

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

          {/* Claude account */}
          <div className="panel flex flex-col p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-ember">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Claude account
                  </h3>
                  <p className="text-2xs text-ink-faint">
                    Run Chat Deploy on your own subscription
                  </p>
                </div>
              </div>
              <Pill tone="live">
                <Check className="h-3 w-3" />
                Linked
              </Pill>
            </div>

            <p className="mt-3 text-2xs leading-relaxed text-ink-dim">
              Chat Deploy&apos;s reasoning runs on your connected claude.ai
              account. Prefer not to link one? The built-in assistant bills
              through platform usage credits instead.
            </p>

            <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-3 font-mono text-2xs font-bold text-ink-dim">
                JC
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-ink">
                  {ACCOUNT.email}
                </div>
                <div className="text-2xs text-ink-faint">
                  OAuth · connected Apr 2026
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-3.5">
              <button className="h-8 flex-1 rounded-lg border border-border bg-surface-2 text-2xs font-medium text-ink-dim hover:text-ink">
                Re-authorise
              </button>
              <button className="h-8 flex-1 rounded-lg border border-down/30 bg-down/10 text-2xs font-medium text-down hover:bg-down/20">
                Revoke access
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* API keys */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="kv text-ink-dim">API keys</h2>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint">
            <Plus className="h-3.5 w-3.5" />
            New key
          </button>
        </div>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {API_KEYS.map((k) => (
              <div key={k.name} className="flex items-center gap-3.5 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{k.name}</div>
                  <div className="truncate font-mono text-2xs text-ink-faint">
                    {k.preview}
                  </div>
                </div>
                <span className="hidden font-mono text-2xs text-ink-faint sm:block">
                  used {k.lastUsed}
                </span>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-faint hover:border-down/40 hover:text-down">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* security */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Security</h2>
        <div className="panel divide-y divide-border-soft p-0">
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
    </div>
  );
}
