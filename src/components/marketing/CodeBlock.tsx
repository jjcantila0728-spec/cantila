"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

/* ------------------------------------------------------------------
   MDX <pre> replacement with a copy-to-clipboard button.

   Shiki has already syntax-highlighted the inner <code> at build time
   (see next.config.mjs rehypeShiki). This wrapper only adds the dark
   panel chrome (brand/identity.md §3.4) and a copy button that reads
   the rendered code's textContent — so it works regardless of how the
   highlighter split the tokens.
   ------------------------------------------------------------------ */
export default function CodeBlock({
  children,
  ...rest
}: {
  children?: ReactNode;
} & React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (e.g. insecure context) — no-op */
    }
  };

  return (
    <div className="group not-prose relative my-5">
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-surface-2/80 text-ink-dim opacity-0 backdrop-blur transition-all hover:border-ink-faint hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-live" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <pre
        ref={preRef}
        className="overflow-x-auto rounded-xl border border-border bg-bg p-4 text-[13px] leading-relaxed text-ink"
        {...rest}
      >
        {children}
      </pre>
    </div>
  );
}
