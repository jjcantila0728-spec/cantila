/* ============================================================
   Marketing-side primitives — buttons, sections, eyebrows, the
   "phase 2 / phase 3" banner. Lives next to the marketing pages
   so the dashboard's components/ stays focused on Console chrome.
   ============================================================ */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function PrimaryCta({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const Tag = external ? "a" : Link;
  const extra = external
    ? { rel: "noreferrer noopener", target: "_blank" }
    : {};
  return (
    <Tag
      href={href}
      {...extra}
      className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-ember px-5 text-sm font-semibold text-[#1a0e08] shadow-[0_10px_28px_-12px_rgba(255,106,61,0.8)] transition-colors hover:bg-ember-bright"
    >
      {children}
      <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
    </Tag>
  );
}

export function SecondaryCta({
  href,
  children,
  tone = "dark",
}: {
  href: string;
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  const cls =
    tone === "dark"
      ? "border-border bg-surface-2 text-ink hover:border-ink-faint"
      : "border-light-border bg-light-bg text-light-ink hover:border-light-ink-faint";
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center gap-1.5 rounded-lg border px-5 text-sm font-medium transition-colors ${cls}`}
    >
      {children}
    </Link>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  bg = "light",
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  bg?: "light" | "paper" | "dark";
}) {
  const wrap =
    bg === "dark"
      ? "bg-bg text-ink"
      : bg === "paper"
        ? "bg-light-surface text-light-ink"
        : "bg-light-bg text-light-ink";
  return (
    <section id={id} className={wrap}>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-6 lg:px-9">
        {(eyebrow || title || description) && (
          <header className="mb-12 max-w-2xl">
            {eyebrow && (
              <p
                className={`kv mb-3 ${
                  bg === "dark" ? "text-ember" : "text-ember-on-light"
                }`}
              >
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                className={`font-display text-3xl font-semibold tracking-cantila-tighter sm:text-4xl ${
                  bg === "dark" ? "text-ink" : "text-light-ink"
                }`}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className={`mt-4 text-base ${
                  bg === "dark" ? "text-ink-dim" : "text-light-ink-dim"
                }`}
              >
                {description}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export function PhaseBanner({
  phase,
}: {
  phase: "live" | "phase-2" | "phase-3";
}) {
  if (phase === "live") return null;
  const copy =
    phase === "phase-2"
      ? "Cantila Mail and its inbound MTA arrive in Phase 2. The MailProvider port is live; we're warming the dedicated IPs and rDNS before flipping the production switch."
      : "Cantila SMS lands in Phase 3. Number marketplace, OTP engine, and inbound webhooks are wired through TelephonyProvider; the live carrier path arrives once Telnyx onboarding completes.";
  return (
    <div className="border-y border-warn/30 bg-warn/[0.06]">
      <div className="mx-auto flex w-full max-w-[1280px] items-start gap-3 px-4 py-3.5 sm:px-6 lg:px-9">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
        <p className="text-sm text-light-ink">
          <span className="mr-2 font-semibold text-warn">Honest about the seams.</span>
          <span className="text-light-ink-dim">{copy}</span>
        </p>
      </div>
    </div>
  );
}

export function FeatureGrid({
  items,
}: {
  items: { title: string; description: ReactNode; icon?: ReactNode }[];
}) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-light-border bg-light-border sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex flex-col gap-2 bg-light-bg p-6 sm:p-7"
        >
          {item.icon && (
            <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-light-surface-2 text-ember-on-light">
              {item.icon}
            </span>
          )}
          <h3 className="font-display text-lg font-semibold tracking-cantila-tight text-light-ink">
            {item.title}
          </h3>
          <p className="text-sm leading-relaxed text-light-ink-dim">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CtaBand({
  title,
  description,
  primary,
  secondary,
}: {
  title: ReactNode;
  description?: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden bg-bg text-ink">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-72" />
      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-4 py-20 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-9">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-cantila-tighter text-ink sm:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-3 text-base text-ink-dim">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryCta href={primary.href}>{primary.label}</PrimaryCta>
          {secondary && <SecondaryCta href={secondary.href}>{secondary.label}</SecondaryCta>}
        </div>
      </div>
    </section>
  );
}
