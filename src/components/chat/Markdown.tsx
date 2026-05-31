"use client";

/* ============================================================
   Markdown — themed markdown renderer for chat bodies.

   react-markdown + remark-gfm (tables/strikethrough/task-lists)
   + rehype-highlight (syntax highlighting). Fenced code blocks
   get a copy button.

   SECURITY: raw HTML is NOT enabled. react-markdown escapes
   HTML by default and we deliberately do not add `rehype-raw`,
   so untrusted agent/user text cannot inject markup.
   ============================================================ */

import { memo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { cx } from "../ui";

// highlight.js theme — scoped via the `.hljs` classes rehype-highlight emits.
import "highlight.js/styles/github-dark.css";

/** Pull raw text out of a code node's children for the copy button. */
function nodeText(children: ReactNode): string {
  if (children == null || children === false) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (
    typeof children === "object" &&
    "props" in (children as { props?: { children?: ReactNode } }) &&
    (children as { props?: { children?: ReactNode } }).props
  ) {
    return nodeText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = nodeText(children).replace(/\n$/, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore.
    }
  };

  return (
    <div className="group/code relative my-2.5 overflow-hidden rounded-lg border border-border-soft bg-[#0a0b0d]">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 z-10 inline-flex h-6 items-center gap-1 rounded-md border border-border bg-surface-2/80 px-1.5 text-2xs text-ink-dim opacity-0 backdrop-blur transition-opacity hover:text-ink group-hover/code:opacity-100"
        aria-label="Copy code"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-live" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> Copy
          </>
        )}
      </button>
      <pre className="overflow-x-auto px-3 py-2.5 text-2xs leading-relaxed">{children}</pre>
    </div>
  );
}

function MarkdownImpl({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx("cantila-md text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          // Block code → our CodeBlock with a copy button. Inline code
          // (no language / single line) stays as a styled <code>.
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          code: ({ className: cls, children, ...props }) => {
            const isBlock = /language-/.test(cls ?? "");
            if (isBlock) {
              return (
                <code className={cls} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.85em] text-ember">
                {children}
              </code>
            );
          },
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ember underline decoration-ember/40 underline-offset-2 hover:decoration-ember"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>
          ),
          p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
          h1: ({ children }) => (
            <h1 className="mb-1.5 mt-3 font-display text-lg font-semibold text-ink first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1.5 mt-3 font-display text-base font-semibold text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2.5 text-sm font-semibold text-ink first:mt-0">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-ember/40 pl-3 text-ink-dim">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border-soft">
              <table className="w-full border-collapse text-2xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border-soft bg-surface-2 px-2.5 py-1.5 text-left font-semibold text-ink">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border-soft/50 px-2.5 py-1.5 text-ink-dim">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-border-soft" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
