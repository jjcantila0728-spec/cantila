/* ============================================================
   HeroDarkBand — the canonical dark hero band that sits at the
   top of every marketing page. Charcoal background, ember glow,
   dot-grid. The marketing body is light (light-bg); this band
   is the brand's only sanctioned ember-glow surface on a public
   page (brand/identity.md §5.3).
   ============================================================ */

import type { ReactNode } from "react";

type Tone = "default" | "compact";

export default function HeroDarkBand({
  eyebrow,
  title,
  description,
  actions,
  visual,
  tone = "default",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
  tone?: Tone;
}) {
  return (
    <section
      className="relative overflow-hidden bg-bg text-ink"
      data-tone={tone}
    >
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-[28rem]" />

      <div
        className={`relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-9 ${
          tone === "compact" ? "pb-12 pt-14 sm:pb-16 sm:pt-20" : "pb-20 pt-20 sm:pb-28 sm:pt-28"
        }`}
      >
        <div className={visual ? "grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center" : ""}>
          <div className="stagger max-w-2xl text-balance">
            {eyebrow && (
              <p className="kv mb-4 text-ember">{eyebrow}</p>
            )}
            <h1
              className={`font-display font-semibold tracking-cantila-display text-ink ${
                tone === "compact"
                  ? "text-4xl sm:text-5xl"
                  : "text-5xl sm:text-6xl lg:text-[64px] lg:leading-[1.05]"
              }`}
            >
              {title}
            </h1>
            {description && (
              <p
                className={`mt-5 text-light-bg/85 ${
                  tone === "compact" ? "max-w-xl text-base" : "max-w-xl text-lg"
                }`}
              >
                {description}
              </p>
            )}
            {actions && (
              <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
            )}
          </div>
          {visual && <div className="relative">{visual}</div>}
        </div>
      </div>

      {/* fade-into-page bottom seam so the light body underneath flows
          naturally out of the dark band */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-light-bg/0" />
    </section>
  );
}
