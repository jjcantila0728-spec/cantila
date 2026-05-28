/* ============================================================
   Project-root mdx-components.tsx — Next 14 App Router reads
   this file to wire MDX renders globally. Without it, MDX pages
   render with unstyled defaults. The MDX pages under
   src/app/(docs)/docs/ rely on these styles for prose typography
   and the Callout / Note components.
   ============================================================ */

import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Info, AlertTriangle, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "ember";
  title?: string;
  children: ReactNode;
}) {
  const map = {
    info: {
      icon: Info,
      classes: "border-info/30 bg-info/[0.06] text-info",
      titleClass: "text-info",
    },
    warn: {
      icon: AlertTriangle,
      classes: "border-warn/30 bg-warn/[0.07] text-warn",
      titleClass: "text-warn",
    },
    ember: {
      icon: Sparkles,
      classes: "border-ember-on-light/30 bg-ember-on-light/[0.06]",
      titleClass: "text-ember-on-light",
    },
  } as const;
  const { icon: Icon, classes, titleClass } = map[tone];
  return (
    <div
      className={`not-prose my-5 flex gap-3 rounded-xl border px-4 py-3.5 ${classes}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1 text-sm text-light-ink">
        {title && (
          <p className={`font-semibold ${titleClass}`}>{title}</p>
        )}
        <div className="prose-callout text-light-ink-dim">{children}</div>
      </div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <Callout tone="info">{children}</Callout>;
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1
        className="mb-4 mt-2 font-display text-3xl font-semibold tracking-cantila-tighter text-light-ink sm:text-4xl"
        {...props}
      />
    ),
    h2: (props) => (
      <h2
        className="mb-3 mt-12 scroll-mt-24 font-display text-2xl font-semibold tracking-cantila-tighter text-light-ink"
        {...props}
      />
    ),
    h3: (props) => (
      <h3
        className="mb-2 mt-8 scroll-mt-24 font-display text-lg font-semibold tracking-cantila-tight text-light-ink"
        {...props}
      />
    ),
    h4: (props) => (
      <h4
        className="mb-2 mt-6 font-display text-base font-semibold tracking-cantila-tight text-light-ink"
        {...props}
      />
    ),
    p: (props) => (
      <p
        className="my-4 text-[15px] leading-relaxed text-light-ink-dim"
        {...props}
      />
    ),
    ul: (props) => (
      <ul
        className="my-4 list-disc space-y-1.5 pl-6 text-[15px] text-light-ink-dim marker:text-light-ink-faint"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="my-4 list-decimal space-y-1.5 pl-6 text-[15px] text-light-ink-dim marker:text-light-ink-faint"
        {...props}
      />
    ),
    li: (props) => <li className="leading-relaxed" {...props} />,
    a: ({ href = "", children, ...rest }) => {
      const isExternal = href.startsWith("http");
      const cls =
        "text-ember-on-light underline-offset-4 hover:underline";
      if (isExternal) {
        return (
          <a
            href={href}
            rel="noreferrer noopener"
            target="_blank"
            className={cls}
            {...rest}
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className={cls}>
          {children}
        </Link>
      );
    },
    blockquote: (props) => (
      <blockquote
        className="my-5 border-l-2 border-ember-on-light/60 bg-light-surface/40 px-4 py-3 text-[15px] italic text-light-ink-dim"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="rounded-md bg-light-surface px-1.5 py-0.5 font-mono text-[13px] text-light-ink"
        {...props}
      />
    ),
    pre: ({ children, ...rest }) => (
      // shiki has already syntax-highlighted the inner <code> at build time
      // and added inline styles. We just provide the panel chrome around it,
      // dark on light per brand/identity.md §3.4.
      <pre
        className="my-5 overflow-x-auto rounded-xl border border-border bg-bg p-4 text-[13px] leading-relaxed text-ink"
        {...rest}
      >
        {children}
      </pre>
    ),
    hr: () => <hr className="my-10 border-light-border-soft" />,
    table: (props) => (
      <div className="my-5 overflow-x-auto rounded-xl border border-light-border">
        <table className="w-full text-left text-sm" {...props} />
      </div>
    ),
    th: (props) => (
      <th
        className="border-b border-light-border-soft bg-light-surface/60 px-4 py-2 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint"
        {...props}
      />
    ),
    td: (props) => (
      <td
        className="border-b border-light-border-soft/50 px-4 py-2 text-light-ink-dim"
        {...props}
      />
    ),
    Callout,
    Note,
    ...components,
  };
}
