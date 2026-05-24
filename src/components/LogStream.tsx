"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Trash2, ArrowDownToLine } from "lucide-react";
import type { LogLine, LogLevel } from "@/lib/types";
import { cx } from "./ui";

const LEVEL_CLS: Record<LogLevel, string> = {
  info: "text-ink-dim",
  warn: "text-warn",
  error: "text-down",
  debug: "text-ink-faint",
  build: "text-ember",
};

const LEVEL_TAG: Record<LogLevel, string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERR ",
  debug: "DBG ",
  build: "SYS ",
};

/* synthetic runtime lines appended while "streaming" */
const STREAM_POOL: { level: LogLevel; source: string; tmpl: string }[] = [
  { level: "info", source: "agent", tmpl: "Health check OK — 200 in {n}ms" },
  { level: "info", source: "router", tmpl: "GET / 200 — {n}ms" },
  { level: "info", source: "router", tmpl: "GET /api/status 200 — {n}ms" },
  { level: "debug", source: "runtime", tmpl: "Heartbeat — queue depth 0, mem stable" },
  { level: "info", source: "router", tmpl: "POST /api/events 202 — {n}ms" },
  { level: "info", source: "edge", tmpl: "cache HIT /static/app.js — {n}ms" },
];

function bump(ts: string): string {
  // ts = HH:MM:SS.mmm
  const m = ts.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (!m) return ts;
  let [h, mi, s] = [Number(m[1]), Number(m[2]), Number(m[3])];
  s += 1 + Math.floor(Math.random() * 4);
  if (s >= 60) {
    s -= 60;
    mi += 1;
  }
  if (mi >= 60) {
    mi -= 60;
    h = (h + 1) % 24;
  }
  const ms = String(Math.floor(Math.random() * 999)).padStart(3, "0");
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(
    s,
  ).padStart(2, "0")}.${ms}`;
}

export default function LogStream({
  initial,
  height = 420,
}: {
  initial: LogLine[];
  height?: number;
}) {
  const [lines, setLines] = useState<LogLine[]>(initial);
  const [running, setRunning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLines((prev) => {
        const lastTs = prev.length ? prev[prev.length - 1].ts : "14:42:00.000";
        const pick = STREAM_POOL[Math.floor(Math.random() * STREAM_POOL.length)];
        const next: LogLine = {
          ts: bump(lastTs),
          level: pick.level,
          source: pick.source,
          message: pick.tmpl.replace(
            "{n}",
            String(8 + Math.floor(Math.random() * 120)),
          ),
        };
        return [...prev, next].slice(-60);
      });
    }, 1900);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0a0b0d]">
      {/* toolbar */}
      <div className="flex items-center gap-3 border-b border-border-soft bg-surface px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-2xs font-medium">
          <span
            className={cx(
              "h-1.5 w-1.5 rounded-full",
              running ? "bg-live animate-blink" : "bg-ink-faint",
            )}
          />
          <span className={running ? "text-live" : "text-ink-faint"}>
            {running ? "Streaming" : "Paused"}
          </span>
        </span>
        <span className="font-mono text-2xs text-ink-faint">
          {lines.length} lines
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-2xs text-ink-dim hover:text-ink"
          >
            {running ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {running ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => setLines([])}
            className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-2xs text-ink-dim hover:text-ink"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
          <button
            onClick={() =>
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              })
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-dim hover:text-ink"
            aria-label="Scroll to bottom"
          >
            <ArrowDownToLine className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* log body */}
      <div
        ref={scrollRef}
        className="overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
        style={{ height }}
      >
        {lines.length === 0 && (
          <p className="py-8 text-center text-ink-faint">
            Log buffer cleared — new lines will appear as they stream.
          </p>
        )}
        {lines.map((l, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="shrink-0 text-ink-faint">{l.ts}</span>
            <span
              className={cx("shrink-0 font-semibold", LEVEL_CLS[l.level])}
            >
              {LEVEL_TAG[l.level]}
            </span>
            <span className="shrink-0 text-violet/80">
              {l.source.padEnd(8)}
            </span>
            <span
              className={cx(
                "whitespace-pre-wrap",
                l.level === "error" || l.level === "warn"
                  ? LEVEL_CLS[l.level]
                  : "text-ink-dim",
              )}
            >
              {l.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
