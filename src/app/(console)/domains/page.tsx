import Link from "next/link";
import {
  Search,
  Globe,
  Lock,
  Link2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader, Pill, cx } from "@/components/ui";
import { domains, registrarDomains, getProject } from "@/lib/mock-data";

export const metadata = { title: "Domains · Cantila Console" };

export default function DomainsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cantila Domains"
        title="Domains & DNS"
        lead="Register, transfer and manage domains in-platform. Point one at an app and Cantila wires the DNS, SSL and email records automatically."
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
                placeholder="yourbrand.com"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ember px-5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright">
              Search
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-ink-faint">
            <Sparkles className="h-3.5 w-3.5 text-ember" />
            Suggestions:
            {[".com", ".io", ".dev", ".app", ".ai"].map((t) => (
              <span
                key={t}
                className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* registered with Cantila */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Registered with Cantila</h2>
        <div className="panel overflow-hidden p-0">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border-soft px-5 py-2.5 kv md:grid">
            <span>Domain</span>
            <span>Renews</span>
            <span>Privacy</span>
            <span>Price</span>
          </div>
          <div className="divide-y divide-border-soft">
            {registrarDomains.map((d) => (
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

      {/* connected domains */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Connected to projects</h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {domains.map((d) => {
              const project = getProject(d.projectId);
              return (
                <div
                  key={d.name}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
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
    </div>
  );
}
