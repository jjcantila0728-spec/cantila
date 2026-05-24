import Link from "next/link";
import { Rocket, TrendingUp, Star } from "lucide-react";
import { PageHeader, Pill, cx } from "@/components/ui";
import { templates } from "@/lib/mock-data";
import type { Template } from "@/lib/types";

export const metadata = { title: "Templates · Cantila Console" };

const CATEGORIES = [
  "All",
  "AI agents",
  "CMS & sites",
  "Databases",
  "Dev tools",
  "Analytics",
];

function TemplateCard({ t }: { t: Template }) {
  return (
    <div className="panel group flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-ink-faint">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface-3 to-surface-2 font-display text-lg font-bold text-ember">
          {t.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-base font-semibold text-ink">
              {t.name}
            </h3>
            {t.featured && (
              <Star className="h-3.5 w-3.5 fill-ember text-ember" />
            )}
          </div>
          <Pill tone="neutral">{t.category}</Pill>
        </div>
      </div>

      <p className="text-sm leading-snug text-ink-dim">{t.blurb}</p>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3">
        <span className="inline-flex items-center gap-1 text-2xs text-ink-faint">
          <TrendingUp className="h-3 w-3" />
          {t.deploys} deploys
        </span>
        <Link
          href="/deploy"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-semibold text-ink transition-colors hover:border-ember/50 hover:bg-ember/10 hover:text-ember"
        >
          <Rocket className="h-3.5 w-3.5" />
          Deploy
        </Link>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const featured = templates.filter((t) => t.featured);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Templates"
        lead="One-click deploys of popular apps and AI agents. Pick one, and Chat Deploy provisions everything it needs."
      />

      {/* featured */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Featured</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t) => (
            <Link
              key={t.id}
              href="/deploy"
              className="panel group relative flex items-center gap-3 overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:border-ember/40"
            >
              <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-16 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-display text-base font-bold text-ember">
                {t.glyph}
              </span>
              <div className="relative min-w-0">
                <div className="truncate font-display text-sm font-semibold text-ink">
                  {t.name}
                </div>
                <div className="text-2xs text-ink-faint">
                  {t.deploys} deploys
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* category filter */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c, i) => (
          <button
            key={c}
            className={cx(
              "rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
              i === 0
                ? "bg-surface-3 text-ink ring-1 ring-border"
                : "text-ink-dim hover:bg-surface-2 hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* all templates */}
      <div className="grid gap-5 stagger sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}
