/* ============================================================
   The Cantila landing page.

   Lives at the apex (cantila.app/) per the routing in
   middleware.ts. On console.cantila.app/ the middleware
   redirects to /dashboard, so this page is only reachable on
   the public host. Voice follows brand/voice.md — short
   sentences, named services, no marketing hedges.
   ============================================================ */

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Brain,
  Database,
  Globe,
  Inbox,
  Phone,
  Plug,
  Sparkles,
  Workflow,
  Terminal,
  CircleDot,
} from "lucide-react";
import HeroDarkBand from "@/components/marketing/HeroDarkBand";
import {
  CtaBand,
  FeatureGrid,
  PrimaryCta,
  SecondaryCta,
  Section,
} from "@/components/marketing/ui";
import PricingTable from "@/components/marketing/PricingTable";
import { PRODUCTS, SITE_TAGLINE } from "@/lib/site-meta";

export const metadata = {
  title: "Cantila — ship anything, live, from one chat",
  description:
    "The VPS-powered hosting cloud where websites, apps, and AI agents ship from a single chat — with the domain, email, SMS, and database already wired in.",
};

const COMPETITIVE = [
  {
    name: "Replit",
    edge: "Hosting-first. Persistent VPS, bundled services, no editor lock-in.",
  },
  {
    name: "Vercel / Netlify",
    edge: "Runs persistent processes and stateful agents, not just functions.",
  },
  {
    name: "Render / Railway",
    edge: "Adds first-party domains, email, SMS, and a chat / MCP deploy front door.",
  },
  {
    name: "Coolify / Dokploy",
    edge: "Fully managed and multi-tenant. Bring-your-own VPS optional.",
  },
];

const TEMPLATES = [
  "n8n",
  "Flowise",
  "OpenClaw",
  "LibreChat",
  "Ghost",
  "Postgres",
  "Next.js",
  "FastAPI",
  "Strapi",
  "Astro",
  "SvelteKit",
  "Hono",
];

export default function LandingPage() {
  return (
    <>
      <HeroDarkBand
        eyebrow="Cantila"
        title={
          <>
            Ship anything, live —{" "}
            <span className="text-ember">from one chat.</span>
          </>
        }
        description={
          <>
            The VPS-powered hosting cloud where websites, apps, and AI agents
            ship from a single chat — with the domain, database, email and
            SMS already wired in. Drop files in. Cantila detects the stack.
            You get a URL.
          </>
        }
        actions={
          <>
            <PrimaryCta href="/signup">Start free</PrimaryCta>
            <SecondaryCta href="/docs/getting-started" tone="dark">
              Read the docs
            </SecondaryCta>
            <Link
              href="/mcp"
              className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink-dim hover:text-ink"
            >
              <Plug className="h-4 w-4 text-ember" /> Add Cantila to Claude
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
        visual={
          <div className="rounded-2xl border border-border bg-surface shadow-lift">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 font-mono text-2xs uppercase tracking-cantila-kv text-ink-faint">
              <span className="inline-flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-ember" />
                Cantila Deploy
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CircleDot className="h-3 w-3 text-live animate-pulse-ring" />
                live
              </span>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <p className="text-ink-dim">
                <span className="text-ink-faint">you · </span>
                ship this repo
              </p>
              <p className="text-ink">
                <span className="text-ember">cantila · </span>
                Detected Next.js 14. Provisioning Postgres + mailbox + SMS
                number. Building…
              </p>
              <div className="space-y-1 font-mono text-xs text-ink-dim">
                <p>build · 00:04 · install deps</p>
                <p>build · 00:23 · next build</p>
                <p>db · postgres-17 · ready · wired into env</p>
                <p>mail · m_a3kf42 · sending enabled</p>
                <p>sms · +1 415 555 0114 · routing webhook</p>
                <p>domain · auto · ssl issued</p>
                <p className="text-live">live · https://chat-app.cantila.app</p>
              </div>
            </div>
          </div>
        }
      />

      {/* services */}
      <Section
        eyebrow="One platform"
        title="Eight services. One account. One bill."
        description="Cantila is hosting plus the four things every real product needs around it. Each one is a first-party Cantila service — not a third-party billed through us."
      >
        <FeatureGrid
          items={PRODUCTS.map((p) => ({
            title: p.name,
            description: p.short,
            icon: <p.icon className="h-4 w-4" />,
          }))}
        />
        <p className="mt-6 text-sm text-light-ink-faint">
          Cantila Mail lands in Phase 2 · Cantila SMS lands in Phase 3.{" "}
          <Link
            href="/changelog"
            className="text-ember-on-light hover:underline"
          >
            See the changelog
          </Link>
          .
        </p>
      </Section>

      {/* MCP */}
      <Section
        eyebrow="Distribution channel"
        title="Ship to Cantila from anywhere you use Claude."
        description='Add the Cantila MCP server once. From then on, any app built inside Claude can deploy to Cantila by asking — "ship this to Cantila, with a Postgres and a custom domain".'
        bg="paper"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <ul className="space-y-3 text-sm text-light-ink-dim">
              {[
                "cantila_deploy — ship a project, get a live URL",
                "cantila_provision_db — managed Postgres / Mongo / Redis",
                "cantila_add_domain — attach a domain, issue SSL",
                "cantila_get_logs · cantila_set_env · cantila_rollback",
                "Stdio for local Claude Code, HTTP for the hosted Claude app",
              ].map((row) => (
                <li key={row} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ember-on-light" />
                  <span>{row}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <PrimaryCta href="/mcp">Read the MCP setup</PrimaryCta>
            </div>
          </div>
          <div className="rounded-2xl border border-light-border bg-light-bg p-5 font-mono text-xs text-light-ink-dim shadow-[0_18px_50px_-30px_rgba(0,0,0,0.18)]">
            <p className="mb-2 text-light-ink-faint">.mcp.json</p>
            <pre className="whitespace-pre-wrap leading-relaxed">{`{
  "mcpServers": {
    "cantila": {
      "url": "https://api.cantila.app/v1/mcp",
      "headers": {
        "Authorization": "Bearer \${CANTILA_API_KEY}"
      }
    }
  }
}`}</pre>
          </div>
        </div>
      </Section>

      {/* templates */}
      <Section
        eyebrow="One-click"
        title="The persistent things, ready to ship."
        description="n8n, OpenClaw, LibreChat, Flowise, Ghost, Strapi — anything that needs to never sleep. Pick a template; Cantila provisions the VPS, the database, the domain, and ships it."
      >
        <div className="flex flex-wrap gap-2.5">
          {TEMPLATES.map((t) => (
            <span
              key={t}
              className="rounded-full border border-light-border bg-light-bg px-3 py-1.5 font-mono text-xs text-light-ink"
            >
              {t}
            </span>
          ))}
        </div>
      </Section>

      {/* competitive */}
      <Section
        eyebrow="Where we sit"
        title="Between the polished-but-narrow app platforms and the powerful-but-raw VPS world."
        description="The full comparison lives in the plan. The short version:"
        bg="paper"
      >
        <div className="grid gap-px overflow-hidden rounded-2xl border border-light-border bg-light-border sm:grid-cols-2 lg:grid-cols-4">
          {COMPETITIVE.map((c) => (
            <div key={c.name} className="bg-light-bg p-6">
              <p className="font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
                vs {c.name}
              </p>
              <p className="mt-3 text-sm text-light-ink">{c.edge}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* pricing teaser */}
      <Section
        eyebrow="Pricing"
        title="Start free. Pay for what you ship."
        description="Hobby is genuinely useful — a small app, a *.cantila.app subdomain, an auto-wired Postgres. Real custom domains, always-on apps, and higher quotas start at $10."
      >
        <PricingTable />
        <div className="mt-7">
          <SecondaryCta href="/pricing" tone="light">
            See full pricing
          </SecondaryCta>
        </div>
      </Section>

      <CtaBand
        title={
          <>
            Ship your first project in <span className="text-ember">3 minutes.</span>
          </>
        }
        description={SITE_TAGLINE}
        primary={{ href: "/signup", label: "Start free" }}
        secondary={{ href: "/docs/getting-started", label: "Read the docs" }}
      />
    </>
  );
}
