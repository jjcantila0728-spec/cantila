/* ============================================================
   LegalPage — a tiny wrapper that gives every legal document
   the same heading shape and effective-date stamp. Body content
   is passed in; this file owns the chrome.
   ============================================================ */

import type { ReactNode } from "react";

export default function LegalPage({
  title,
  effective,
  intro,
  children,
}: {
  title: string;
  effective: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="prose-legal">
      <p className="font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
        Legal
      </p>
      <h1 className="mb-2 mt-3 font-display text-4xl font-semibold tracking-cantila-tighter text-light-ink">
        {title}
      </h1>
      <p className="font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
        Effective {effective}
      </p>
      {intro && (
        <p className="mt-6 text-[15px] leading-relaxed text-light-ink-dim">
          {intro}
        </p>
      )}
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-light-ink-dim [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-light-ink [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-light-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:text-ember-on-light [&_a:hover]:underline [&_strong]:text-light-ink">
        {children}
      </div>
    </article>
  );
}
