/* ============================================================
   Cantila Console — UI primitives
   Small, presentational, server-component safe (no hooks).
   ============================================================ */

import type { ReactNode } from "react";

/* classnames helper */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- status vocabulary ---------- */

type StatusTone = {
  label: string;
  dot: string;
  text: string;
  bg: string;
  ring: string;
  live?: boolean;
};

const STATUS: Record<string, StatusTone> = {
  live: { label: "Live", dot: "bg-live", text: "text-live", bg: "bg-live/10", ring: "ring-live/20", live: true },
  building: { label: "Building", dot: "bg-ember", text: "text-ember", bg: "bg-ember/10", ring: "ring-ember/20" },
  queued: { label: "Queued", dot: "bg-info", text: "text-info", bg: "bg-info/10", ring: "ring-info/20" },
  sleeping: { label: "Sleeping", dot: "bg-violet", text: "text-violet", bg: "bg-violet/10", ring: "ring-violet/20" },
  crashed: { label: "Crashed", dot: "bg-down", text: "text-down", bg: "bg-down/10", ring: "ring-down/20" },
  failed: { label: "Failed", dot: "bg-down", text: "text-down", bg: "bg-down/10", ring: "ring-down/20" },
  paused: { label: "Paused", dot: "bg-ink-faint", text: "text-ink-dim", bg: "bg-surface-3", ring: "ring-border" },
  "rolled-back": { label: "Rolled back", dot: "bg-warn", text: "text-warn", bg: "bg-warn/10", ring: "ring-warn/20" },
  superseded: { label: "Superseded", dot: "bg-ink-faint", text: "text-ink-faint", bg: "bg-surface-3", ring: "ring-border" },
  healthy: { label: "Healthy", dot: "bg-live", text: "text-live", bg: "bg-live/10", ring: "ring-live/20", live: true },
  provisioning: { label: "Provisioning", dot: "bg-ember", text: "text-ember", bg: "bg-ember/10", ring: "ring-ember/20" },
  active: { label: "Active", dot: "bg-live", text: "text-live", bg: "bg-live/10", ring: "ring-live/20", live: true },
};

export function statusTone(status: string): StatusTone {
  return STATUS[status] ?? STATUS.paused;
}

export function StatusDot({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span className="relative inline-flex h-2 w-2">
      {t.live && (
        <span
          className={cx("absolute inline-flex h-full w-full rounded-full opacity-70", t.dot, "animate-pulse-ring")}
        />
      )}
      <span className={cx("relative inline-flex h-2 w-2 rounded-full", t.dot)} />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ring-1",
        t.bg,
        t.text,
        t.ring,
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", t.dot)} />
      {t.label}
    </span>
  );
}

/* ---------- generic pill ---------- */

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ember" | "live" | "info" | "violet" | "warn" | "down";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-3 text-ink-dim ring-border",
    ember: "bg-ember/10 text-ember ring-ember/20",
    live: "bg-live/10 text-live ring-live/20",
    info: "bg-info/10 text-info ring-info/20",
    violet: "bg-violet/10 text-violet ring-violet/20",
    warn: "bg-warn/10 text-warn ring-warn/20",
    down: "bg-down/10 text-down ring-down/20",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-medium ring-1",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ---------- panel ---------- */

export function Panel({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={cx("panel", pad && "p-5", className)}>{children}</div>
  );
}

/* ---------- page header ---------- */

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="kv mb-2 text-ember">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">
          {title}
        </h1>
        {lead && (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-dim">{lead}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------- section label ---------- */

export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="kv text-ink-dim">{children}</h2>
      {right}
    </div>
  );
}

/* ---------- buttons (anchor + button) ---------- */

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all focus-ring disabled:opacity-50";

const BTN_VARIANTS: Record<string, string> = {
  primary:
    "bg-ember text-[#1a0e08] hover:bg-ember-bright shadow-[0_6px_20px_-8px_rgba(255,106,61,0.6)]",
  ghost: "text-ink-dim hover:bg-surface-3 hover:text-ink",
  outline: "border border-border bg-surface-2 text-ink hover:border-ink-faint hover:bg-surface-3",
};

const BTN_SIZES: Record<string, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-4",
};

export function Button({
  children,
  variant = "outline",
  size = "md",
  className,
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(BTN_BASE, BTN_VARIANTS[variant], BTN_SIZES[size], className)}
    >
      {children}
    </button>
  );
}

/* ---------- key/value row ---------- */

export function KeyVal({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="kv">{k}</span>
      <span className="text-right text-sm text-ink">{children}</span>
    </div>
  );
}

/* ---------- progress meter ---------- */

export function Meter({
  value,
  tone = "ember",
}: {
  value: number; // 0..100
  tone?: "ember" | "live" | "warn" | "down" | "info" | "violet";
}) {
  const tones: Record<string, string> = {
    ember: "bg-ember",
    live: "bg-live",
    warn: "bg-warn",
    down: "bg-down",
    info: "bg-info",
    violet: "bg-violet",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className={cx("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ---------- runtime glyph ---------- */

const RUNTIME_GLYPH: Record<string, { label: string; cls: string }> = {
  "Next.js": { label: "▲", cls: "text-ink" },
  "Node.js": { label: "⬢", cls: "text-live" },
  Python: { label: "py", cls: "text-info" },
  PHP: { label: "php", cls: "text-violet" },
  Static: { label: "{}", cls: "text-ink-dim" },
  Docker: { label: "⬓", cls: "text-info" },
  Go: { label: "Go", cls: "text-info" },
};

export function RuntimeMark({ runtime }: { runtime: string }) {
  const g = RUNTIME_GLYPH[runtime] ?? { label: "•", cls: "text-ink-dim" };
  return (
    <span
      className={cx(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-mono text-xs font-semibold",
        g.cls,
      )}
      title={runtime}
    >
      {g.label}
    </span>
  );
}
