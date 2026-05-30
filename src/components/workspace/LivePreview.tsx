"use client";

import { useState } from "react";
import { Monitor, Smartphone, RefreshCw, ExternalLink } from "lucide-react";
import { cx } from "../ui";

export default function LivePreview({ url }: { url: string | null }) {
  const [mode, setMode] = useState<"web" | "mobile">("web");
  const [nonce, setNonce] = useState(0);

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-dim">
        Not deployed yet — the live preview appears once a domain resolves.
      </div>
    );
  }

  const frame = (
    <iframe
      key={nonce}
      src={url}
      title="Live preview"
      className="h-full w-full border-0 bg-white"
    />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <button
          onClick={() => setMode("web")}
          title="Web"
          className={cx("rounded p-1", mode === "web" ? "bg-surface-2 text-ink" : "text-ink-dim")}
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setMode("mobile")}
          title="Mobile"
          className={cx("rounded p-1", mode === "mobile" ? "bg-surface-2 text-ink" : "text-ink-dim")}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setNonce((n) => n + 1)} title="Refresh" className="ml-auto rounded p-1 text-ink-dim hover:text-ink">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a href={url} target="_blank" rel="noreferrer" title="Open" className="rounded p-1 text-ink-dim hover:text-ink">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-bg">
        {mode === "web" ? (
          frame
        ) : (
          <div className="flex h-full items-start justify-center p-4">
            <div className="h-[680px] w-[360px] overflow-hidden rounded-[2rem] border-4 border-ink/40 bg-white shadow-lift">
              {frame}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
