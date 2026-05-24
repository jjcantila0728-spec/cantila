"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cx } from "./ui";

export default function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }

  return (
    <button
      onClick={copy}
      className={cx(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-2xs font-medium transition-colors",
        copied
          ? "border-live/30 bg-live/10 text-live"
          : "border-border bg-surface-2 text-ink-dim hover:border-ink-faint hover:text-ink",
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

/* a read-only code field with a copy affordance */
export function CopyField({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-[#0a0b0d] px-3 py-2">
      <code className="flex-1 truncate font-mono text-xs text-ink-dim">
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}
