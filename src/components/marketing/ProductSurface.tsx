/* ============================================================
   ProductSurface — the one template every /products/* page
   reuses. A product page is: hero band → phase banner (when
   applicable) → "what's in the box" feature grid → optional
   detail rows → CTA band. The actual copy lives in each page
   file; this component owns the shape and the spacing.
   ============================================================ */

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import HeroDarkBand from "./HeroDarkBand";
import { CtaBand, FeatureGrid, PhaseBanner, PrimaryCta, Section, SecondaryCta } from "./ui";
import type { Product } from "@/lib/site-meta";

export type DetailRow = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  bullets?: string[];
  visual?: ReactNode;
};

export default function ProductSurface({
  product,
  hero,
  features,
  details,
  cta,
}: {
  product: Product;
  hero: {
    title: ReactNode;
    description: ReactNode;
    primary?: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
  features: {
    title: string;
    description: ReactNode;
    icon?: ReactNode;
  }[];
  details?: DetailRow[];
  cta?: {
    title: ReactNode;
    description?: ReactNode;
    primary: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
}) {
  return (
    <>
      <HeroDarkBand
        eyebrow={product.name}
        title={hero.title}
        description={hero.description}
        actions={
          <>
            <PrimaryCta href={hero.primary?.href ?? "/signup"}>
              {hero.primary?.label ?? "Start free"}
            </PrimaryCta>
            <SecondaryCta href={hero.secondary?.href ?? "/docs"} tone="dark">
              {hero.secondary?.label ?? "Read the docs"}
            </SecondaryCta>
          </>
        }
      />

      <PhaseBanner phase={product.phase} />

      <Section
        eyebrow="What's in the box"
        title={`${product.name}, end to end`}
        bg="light"
      >
        <FeatureGrid items={features} />
      </Section>

      {details && details.length > 0 && (
        <Section bg="paper">
          <div className="space-y-20">
            {details.map((row, idx) => (
              <div
                key={idx}
                className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]"
              >
                <div>
                  <p className="kv mb-3 text-ember-on-light">{row.eyebrow}</p>
                  <h3 className="font-display text-2xl font-semibold tracking-cantila-tighter text-light-ink sm:text-3xl">
                    {row.title}
                  </h3>
                  <p className="mt-3 text-light-ink-dim">{row.description}</p>
                  {row.bullets && (
                    <ul className="mt-5 space-y-2.5">
                      {row.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-sm text-light-ink-dim"
                        >
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-ember-on-light"
                            strokeWidth={2.4}
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {row.visual ?? (
                  <div className="rounded-2xl border border-light-border bg-light-bg p-8 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.18)]">
                    <PlaceholderArtwork title={row.title} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <CtaBand
        title={cta?.title ?? "Ready to ship?"}
        description={cta?.description}
        primary={cta?.primary ?? { href: "/signup", label: "Start free" }}
        secondary={cta?.secondary ?? { href: "/pricing", label: "See pricing" }}
      />
    </>
  );
}

function PlaceholderArtwork({ title }: { title: string }) {
  // A small log-style artwork that reads as "this is a live system" without
  // shipping a real product screenshot. Looks like a chunk of console output.
  return (
    <div className="font-mono text-xs text-light-ink-dim">
      <div className="mb-3 flex items-center gap-2 text-light-ink-faint">
        <span className="h-2 w-2 rounded-full bg-down" />
        <span className="h-2 w-2 rounded-full bg-warn" />
        <span className="h-2 w-2 rounded-full bg-live" />
        <span className="ml-2 truncate">{title.toLowerCase()}</span>
      </div>
      <div className="space-y-1.5 text-[12.5px] leading-relaxed">
        <p>
          <span className="text-ember-on-light">→</span> cantila ready · provisioning
        </p>
        <p className="text-light-ink-faint">build · 00:04 · stack detected</p>
        <p className="text-light-ink-faint">db · postgres-17 · wired</p>
        <p className="text-light-ink-faint">domain · auto · ssl issued</p>
        <p className="text-live">live · https://&lt;slug&gt;.cantila.app</p>
      </div>
    </div>
  );
}
