import { Mail, MessageSquare, BookOpen, Wrench } from "lucide-react";
import HeroDarkBand from "@/components/marketing/HeroDarkBand";
import { Section } from "@/components/marketing/ui";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact",
  description:
    "Talk to JJ — founder@cantila.app, on Discord, on the docs site, or through the Console.",
  path: "/contact",
});

const CHANNELS = [
  {
    icon: Mail,
    title: "Email JJ",
    body: "Best for anything specific — a quote, an account problem, a press question, an integration partnership. Replies same day on weekdays.",
    cta: { label: "founder@cantila.app", href: "mailto:founder@cantila.app" },
  },
  {
    icon: MessageSquare,
    title: "Cantila on Discord",
    body: "Public room for builders — questions, deploy stories, what should ship next. JJ is in there daily.",
    cta: { label: "Open Discord", href: "https://discord.gg/cantila", external: true },
  },
  {
    icon: BookOpen,
    title: "Read the docs first",
    body: "If your question is \"how do I X\" — the docs cover Chat Deploy, the CLI, the MCP server, auto-wired services, and billing.",
    cta: { label: "Read the docs", href: "/docs" },
  },
  {
    icon: Wrench,
    title: "Operational issues",
    body: "Status page is the source of truth for uptime. Page JJ via founder@cantila.app for anything urgent that isn't covered there.",
    cta: { label: "View status", href: "/status" },
  },
];

export default function ContactPage() {
  return (
    <>
      <HeroDarkBand
        eyebrow="Contact"
        title={
          <>
            Talk to a real person —{" "}
            <span className="text-ember">that person is JJ.</span>
          </>
        }
        description="Cantila is a one-person company. There's no support tier and no first-line filter; you reach the founder directly."
        tone="compact"
      />

      <Section eyebrow="Channels" title="Pick the one that fits.">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map(({ icon: Icon, ...c }) => (
            <a
              key={c.title}
              href={c.cta.href}
              {...(c.cta.external
                ? { rel: "noreferrer noopener", target: "_blank" }
                : {})}
              className="group flex flex-col rounded-2xl border border-light-border bg-light-bg p-6 transition-colors hover:border-light-ink-faint"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-light-surface-2 text-ember-on-light">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-cantila-tight text-light-ink">
                {c.title}
              </h3>
              <p className="mt-1 text-sm text-light-ink-dim">{c.body}</p>
              <span className="mt-4 font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
                {c.cta.label} →
              </span>
            </a>
          ))}
        </div>
      </Section>
    </>
  );
}
