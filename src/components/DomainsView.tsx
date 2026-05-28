"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Globe,
  Lock,
  Link2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Plus,
  Check,
  CircleSlash,
  Loader2,
  Zap,
} from "lucide-react";
import { PageHeader, Pill, Button, cx } from "@/components/ui";
import Modal, { Field, inputClass } from "@/components/Modal";
import { domains, registrarDomains, projects, getProject } from "@/lib/mock-data";
import type { Domain } from "@/lib/types";
import { api, isControlPlaneLive } from "@/lib/api";

const TLDS = [
  { tld: ".com", price: "$12 / yr" },
  { tld: ".io", price: "$38 / yr" },
  { tld: ".dev", price: "$14 / yr" },
  { tld: ".app", price: "$16 / yr" },
  { tld: ".ai", price: "$79 / yr" },
];

type Result = { name: string; price: string; available: boolean };
type Registered = (typeof registrarDomains)[number];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function DomainsView() {
  // Empty until the effect below resolves the control-plane state — keeps
  // mock rows from leaking into a logged-in user's view.
  const [registered, setRegistered] = useState<Registered[]>([]);
  const [connected, setConnected] = useState<Domain[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    projectId: projects[0]?.id ?? "",
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setRegistered([...registrarDomains]);
        setConnected([...domains]);
        return;
      }
      try {
        const { registrations } = await api.listRegistrations();
        if (cancelled) return;
        const live: Registered[] = registrations.map((r) => ({
          name: r.hostname,
          registrar: "Cantila Domains",
          renewsAt: new Date(r.expiresAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          autoRenew: r.autoRenew,
          privacy: r.whoisPrivacy,
          price: `$${(r.pricePerYearCents / 100).toFixed(2)} / yr`,
        }));
        setRegistered(live);
      } catch {
        /* swallow — empty state will render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSearch() {
    const base = searchInput
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    if (!base) return;

    if (liveMode) {
      setSearching(true);
      try {
        const { results: live } = await api.searchDomains(
          base,
          "com,dev,io,app,ai,co,shop,xyz,build",
        );
        setResults(
          live.map((r) => ({
            name: r.hostname,
            price: `${r.pricePerYearDisplay} / yr`,
            available: r.available,
          })),
        );
      } finally {
        setSearching(false);
      }
      return;
    }

    // Offline fallback — hash-based mock
    const root = base.replace(/\..*$/, "");
    setResults(
      TLDS.map((t) => ({
        name: root + t.tld,
        price: t.price,
        available: hash(root + t.tld) % 5 !== 0,
      })),
    );
  }

  async function register(r: Result) {
    if (liveMode) {
      setBuying(r.name);
      try {
        const result = await api.registerDomain({ hostname: r.name, years: 1 });
        setRegistered((prev) => [
          {
            name: result.registration.hostname,
            registrar: "Cantila Domains",
            renewsAt: new Date(result.registration.expiresAt).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric", year: "numeric" },
            ),
            autoRenew: result.registration.autoRenew,
            privacy: result.registration.whoisPrivacy,
            price: `$${(result.registration.pricePerYearCents / 100).toFixed(2)} / yr`,
          },
          ...prev,
        ]);
      } finally {
        setBuying(null);
      }
    } else {
      setRegistered((prev) => [
        {
          name: r.name,
          registrar: "Cantila Domains",
          renewsAt: "May 14, 2027",
          autoRenew: true,
          privacy: true,
          price: r.price,
        },
        ...prev,
      ]);
    }
    setResults(null);
    setSearchInput("");
  }

  function addDomain() {
    const name = addForm.name.trim().toLowerCase().replace(/\s+/g, "");
    if (!name) return;
    const domain: Domain = {
      name,
      kind: "custom",
      projectId: addForm.projectId,
      ssl: "issuing",
      dns: "pending",
      primary: false,
    };
    setConnected((prev) => [domain, ...prev]);
    setAddForm({ name: "", projectId: projects[0]?.id ?? "" });
    setAddOpen(false);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Cantila Domains · registrar live" : "Cantila Domains"}
        title="Domains & DNS"
        lead="Register, transfer and manage domains in-platform. Point one at an app and Cantila wires the DNS, SSL and email records automatically."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> selling
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                offline · mock prices
              </span>
            )}
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
            >
              <Plus className="h-4 w-4" />
              Connect domain
            </button>
          </div>
        }
      />

      {/* registrar search */}
      <div className="panel relative overflow-hidden p-5">
        <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-24" />
        <div className="relative">
          <h2 className="font-display text-sm font-semibold text-ink">
            Find a new domain
          </h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex h-10 flex-1 items-center gap-2.5 rounded-lg border border-border bg-bg px-3">
              <Search className="h-4 w-4 text-ink-faint" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="yourbrand"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            <button
              onClick={runSearch}
              disabled={searching}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ember px-5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-60"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" strokeWidth={2.4} />
              )}
              Search
            </button>
          </div>

          {results === null ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-ink-faint">
              <Sparkles className="h-3.5 w-3.5 text-ember" />
              Searches: {TLDS.map((t) => t.tld).join("  ")}
            </div>
          ) : (
            <div className="mt-4 space-y-1.5">
              {results.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5"
                >
                  <Globe
                    className={cx(
                      "h-4 w-4 shrink-0",
                      r.available ? "text-live" : "text-ink-faint",
                    )}
                  />
                  <span className="font-mono text-sm text-ink">{r.name}</span>
                  {r.available ? (
                    <Pill tone="live">
                      <Check className="h-3 w-3" />
                      Available
                    </Pill>
                  ) : (
                    <Pill tone="neutral">
                      <CircleSlash className="h-3 w-3" />
                      Taken
                    </Pill>
                  )}
                  <span className="ml-auto font-mono text-2xs text-ink-dim">
                    {r.price}
                  </span>
                  <Button
                    size="sm"
                    variant={r.available ? "primary" : "outline"}
                    disabled={!r.available || buying === r.name}
                    onClick={() => register(r)}
                  >
                    {buying === r.name ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    {buying === r.name ? "Registering…" : "Register"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* registered */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Registered with Cantila · {registered.length}
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border-soft px-5 py-2.5 kv md:grid">
            <span>Domain</span>
            <span>Renews</span>
            <span>Privacy</span>
            <span>Price</span>
          </div>
          <div className="divide-y divide-border-soft">
            {registered.map((d) => (
              <div
                key={d.name}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-info" />
                  <span className="font-mono text-sm text-ink">{d.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-dim">
                  <RefreshCw className="h-3 w-3 text-ink-faint" />
                  {d.renewsAt}
                  {d.autoRenew && (
                    <span className="hidden md:inline">
                      <Pill tone="live">auto</Pill>
                    </span>
                  )}
                </div>
                <div>
                  {d.privacy ? (
                    <Pill tone="info">
                      <ShieldCheck className="h-3 w-3" />
                      WHOIS private
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Public</Pill>
                  )}
                </div>
                <div className="font-mono text-xs text-ink-dim">{d.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* connected */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Connected to projects · {connected.length}
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {connected.map((d) => {
              const project = getProject(d.projectId);
              return (
                <div key={d.name} className="flex items-center gap-3 px-5 py-3.5">
                  <Globe
                    className={cx(
                      "h-4 w-4 shrink-0",
                      d.kind === "custom" ? "text-ember" : "text-info",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm text-ink">
                        {d.name}
                      </span>
                      {d.primary && <Pill tone="ember">Primary</Pill>}
                    </div>
                    {project && (
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-2xs text-ink-faint hover:text-ember"
                      >
                        → {project.name}
                      </Link>
                    )}
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <Pill tone={d.ssl === "active" ? "live" : "warn"}>
                      <Lock className="h-3 w-3" />
                      {d.ssl === "active" ? "SSL active" : "SSL issuing"}
                    </Pill>
                    <Pill tone={d.dns === "wired" ? "info" : "neutral"}>
                      <Link2 className="h-3 w-3" />
                      DNS {d.dns}
                    </Pill>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* connect domain modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Connect a domain"
        description="Point a domain you already own at a Cantila project."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={addDomain}
              disabled={!addForm.name.trim()}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Connect
            </Button>
          </>
        }
      >
        <Field label="Domain" hint="Cantila will issue SSL and wire DNS automatically.">
          <input
            autoFocus
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") addDomain();
            }}
            placeholder="app.example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Project">
          <select
            value={addForm.projectId}
            onChange={(e) =>
              setAddForm({ ...addForm, projectId: e.target.value })
            }
            className={inputClass}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </Modal>
    </div>
  );
}
