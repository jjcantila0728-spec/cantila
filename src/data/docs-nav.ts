/* ============================================================
   Single source-of-truth for the /docs information architecture.
   Drives the sidebar (DocsSidebar), the docs index grid, the
   breadcrumb + Article JSON-LD in (docs)/layout.tsx, prev/next
   paging, the 404 gate, and the ⌘K docs search.

   To add a page: drop the MDX file at the matching route under
   src/app/(docs)/docs/<slug> and add an entry here.
   ============================================================ */

export type DocPage = {
  slug: string;
  title: string;
  description?: string;
  /** Extra search terms for the ⌘K docs search, beyond title + description. */
  keywords?: string[];
};

export type DocsGroup = {
  heading: string;
  pages: DocPage[];
};

export const DOCS_NAV: DocsGroup[] = [
  {
    heading: "Get started",
    pages: [
      {
        slug: "/docs",
        title: "Overview",
        description: "What Cantila is and how the docs are organised.",
        keywords: ["introduction", "index", "home"],
      },
      {
        slug: "/docs/getting-started",
        title: "Quickstart",
        description: "Sign up and ship your first project from chat in five steps.",
        keywords: ["start", "first deploy", "tutorial", "signup"],
      },
      {
        slug: "/docs/concepts",
        title: "Core concepts",
        description:
          "Control plane, data plane, projects, deployments, auto-wired services, and the phase model.",
        keywords: ["architecture", "control plane", "data plane", "glossary"],
      },
    ],
  },
  {
    heading: "Deploy",
    pages: [
      {
        slug: "/docs/deploy/chat",
        title: "Chat Deploy",
        description: "Drop files or describe what you want — get a live URL.",
        keywords: ["chat", "conversational", "assistant", "ship"],
      },
      {
        slug: "/docs/deploy/git",
        title: "Push-to-deploy (git)",
        description: "Connect a repo for branch deploys and PR previews.",
        keywords: ["github", "git", "webhook", "branch", "ci"],
      },
      {
        slug: "/docs/deploy/upload",
        title: "File & zip upload",
        description: "Ship a folder or zip directly from the Console or CLI.",
        keywords: ["upload", "zip", "folder", "files"],
      },
      {
        slug: "/docs/deploy/builds",
        title: "Builds & runtimes",
        description: "Stack detection with Nixpacks, custom Dockerfiles, supported languages.",
        keywords: ["nixpacks", "dockerfile", "node", "python", "php", "go", "runtime", "build"],
      },
      {
        slug: "/docs/deploy/env",
        title: "Environment variables & secrets",
        description: "Set, scope, and inject env vars and secrets into builds and runtime.",
        keywords: ["env", "secrets", "variables", "configuration"],
      },
      {
        slug: "/docs/deploy/rollbacks",
        title: "Deployments & rollback",
        description: "How deployments supersede each other, and instant one-click rollback.",
        keywords: ["rollback", "deployment", "revert", "history"],
      },
      {
        slug: "/docs/deploy/scaling",
        title: "Scaling & sleep/wake",
        description: "Instances, resource sizing, and idle sleep with wake-on-demand.",
        keywords: ["scale", "instances", "sleep", "wake", "memory", "cpu"],
      },
      {
        slug: "/docs/deploy/logs",
        title: "Logs & metrics",
        description: "Streaming build and runtime logs, plus per-project metrics.",
        keywords: ["logs", "metrics", "sse", "streaming", "observability"],
      },
      {
        slug: "/docs/deploy/backups",
        title: "Backups & restore",
        description: "Point-in-time project snapshots and one-click restore.",
        keywords: ["backup", "restore", "snapshot", "recovery"],
      },
      {
        slug: "/docs/deploy/previews",
        title: "Preview environments",
        description: "Per-branch preview deployments with their own URLs.",
        keywords: ["preview", "staging", "branch", "pr"],
      },
    ],
  },
  {
    heading: "Platform services",
    pages: [
      {
        slug: "/docs/auto-wired",
        title: "Auto-wired services",
        description: "The database, mailbox, and SMS number every project ships with.",
        keywords: ["auto-wired", "bundled", "provision", "connected"],
      },
      {
        slug: "/docs/databases",
        title: "Databases & storage",
        description: "Managed PostgreSQL and S3-compatible object storage.",
        keywords: ["postgres", "database", "storage", "bucket", "s3", "data", "redis", "mysql"],
      },
      {
        slug: "/docs/domains",
        title: "Domains & DNS",
        description: "Search, register, and auto-wire domains with DNS and SSL.",
        keywords: ["domain", "dns", "registrar", "ssl", "tld", "whois"],
      },
      {
        slug: "/docs/mail",
        title: "Mail",
        description: "Sending, mailboxes, webmail, and inbound — the first-party email provider.",
        keywords: ["email", "mail", "smtp", "mailbox", "imap", "webmail", "inbound"],
      },
      {
        slug: "/docs/sms",
        title: "SMS, Voice & Numbers",
        description: "Two-way SMS, voice, OTP, the number marketplace, and A2P/10DLC.",
        keywords: ["sms", "voice", "otp", "numbers", "telephony", "a2p", "10dlc", "calls"],
      },
      {
        slug: "/docs/automations",
        title: "Automations",
        description: "Managed n8n and OpenClaw behind a native Cantila workflow canvas.",
        keywords: ["automation", "n8n", "openclaw", "workflow", "canvas", "nodes"],
      },
      {
        slug: "/docs/connections",
        title: "Connections",
        description: "Account-wide integrations and credentials, reused across workflows.",
        keywords: ["connections", "credentials", "oauth", "integrations", "slack", "gmail"],
      },
      {
        slug: "/docs/agents",
        title: "Agents",
        description: "The self-healing brain and agent swarm that keep the fleet up.",
        keywords: ["agents", "brain", "self-healing", "uptime", "autonomous"],
      },
      {
        slug: "/docs/templates",
        title: "Template marketplace",
        description: "One-click create-and-deploy starters for popular apps and agents.",
        keywords: ["templates", "marketplace", "starter", "boilerplate"],
      },
    ],
  },
  {
    heading: "Cantila + Claude",
    pages: [
      {
        slug: "/docs/mcp",
        title: "MCP server",
        description: "Add Cantila to Claude and deploy from anywhere you use it.",
        keywords: ["mcp", "claude", "model context protocol", "tools", "cowork"],
      },
      {
        slug: "/docs/claude-account",
        title: "Connect your Claude account",
        description: "Run the Chat Deploy assistant on your own Claude subscription.",
        keywords: ["claude", "oauth", "anthropic", "account", "assistant"],
      },
    ],
  },
  {
    heading: "Account",
    pages: [
      {
        slug: "/docs/billing",
        title: "Plans, billing & invoices",
        description: "Stripe-backed plans, metered overage, and the Billing Portal.",
        keywords: ["billing", "plans", "invoices", "stripe", "usage", "pricing"],
      },
      {
        slug: "/docs/teams",
        title: "Teams & roles",
        description: "Invite teammates and manage roles and access.",
        keywords: ["team", "members", "roles", "invite", "rbac", "access"],
      },
      {
        slug: "/docs/orgs",
        title: "Organizations",
        description: "Per-user orgs, sub-accounts, and switching between them.",
        keywords: ["orgs", "organizations", "sub-account", "tenancy", "switch"],
      },
      {
        slug: "/docs/auth",
        title: "Auth, sessions & 2FA",
        description: "Sign-in, sessions, password reset, email verification, and 2FA.",
        keywords: ["auth", "login", "session", "2fa", "password", "sso", "security"],
      },
    ],
  },
  {
    heading: "CLI",
    pages: [
      {
        slug: "/docs/cli",
        title: "The Cantila CLI",
        description: "Install `cantila`, authenticate, and ship from the terminal.",
        keywords: ["cli", "cantila", "terminal", "install", "command line"],
      },
      {
        slug: "/docs/cli/commands",
        title: "Command reference",
        description: "Every `cantila` command and its options.",
        keywords: ["commands", "reference", "deploy", "env", "keys", "flags"],
      },
      {
        slug: "/docs/cli/config",
        title: "Configuration",
        description: "The config file and environment variables the CLI reads.",
        keywords: ["config", "environment", "token", "control plane url"],
      },
    ],
  },
  {
    heading: "API reference",
    pages: [
      {
        slug: "/docs/api",
        title: "API overview",
        description: "Base URL, authentication, errors, idempotency, and the activity audit.",
        keywords: ["api", "rest", "authentication", "errors", "bearer", "api key", "v1"],
      },
      {
        slug: "/docs/api/projects",
        title: "Projects & deploys",
        description: "Projects, deployments, env, logs, scaling, backups, and instances.",
        keywords: ["projects", "deploy", "env", "logs", "scale", "backups", "instances"],
      },
      {
        slug: "/docs/api/domains",
        title: "Domains",
        description: "Domain search, quotes, registrations, and project aliases.",
        keywords: ["domains", "dns", "aliases", "registrations", "search"],
      },
      {
        slug: "/docs/api/data",
        title: "Databases & storage",
        description: "Managed databases and S3-compatible storage buckets.",
        keywords: ["databases", "storage", "buckets", "postgres"],
      },
      {
        slug: "/docs/api/mail",
        title: "Mail",
        description: "Fleet, send, inbox, deliverability, mailboxes, and aliases.",
        keywords: ["mail", "send", "inbox", "deliverability", "mailboxes", "aliases"],
      },
      {
        slug: "/docs/api/sms",
        title: "SMS, Voice & Numbers",
        description: "Send, OTP, inbound, voice calls, the number marketplace, and A2P.",
        keywords: ["sms", "otp", "voice", "numbers", "a2p", "calls"],
      },
      {
        slug: "/docs/api/agents",
        title: "Agents & monitoring",
        description: "Agents, activity feed, monitoring, capacity, and nodes.",
        keywords: ["agents", "activity", "monitoring", "capacity", "nodes", "metrics"],
      },
      {
        slug: "/docs/api/billing",
        title: "Billing",
        description: "Billing summary, invoices, plan changes, and checkout sessions.",
        keywords: ["billing", "invoices", "plan change", "checkout", "portal"],
      },
      {
        slug: "/docs/api/account",
        title: "Account & access",
        description: "Accounts/me, team members, orgs, invites, API keys, and auth.",
        keywords: ["account", "me", "team", "orgs", "invites", "api keys", "auth"],
      },
    ],
  },
  {
    heading: "Cantilapay",
    pages: [
      {
        slug: "/docs/pay",
        title: "Payments overview",
        description: "Accept payments via Cantilapay — tenant-as-merchant on Adyen for Platforms.",
        keywords: ["payments", "cantilapay", "adyen", "merchant of record", "test mode"],
      },
      {
        slug: "/docs/pay/quickstart",
        title: "Quickstart",
        description: "Install the SDK, authenticate, and take your first payment.",
        keywords: ["payments", "quickstart", "sdk", "first payment", "install"],
      },
      {
        slug: "/docs/pay/sdk",
        title: "Node SDK reference",
        description: "Every resource in @cantila/cantilapay — methods, types, and errors.",
        keywords: ["sdk", "node", "customers", "payment intents", "subscriptions", "refunds", "checkout", "payouts", "tax"],
      },
      {
        slug: "/docs/pay/webhooks",
        title: "Webhooks",
        description: "Subscribe to payment events and verify webhook signatures.",
        keywords: ["webhooks", "events", "signature", "verify", "hmac"],
      },
    ],
  },
];

export const FLAT_DOCS: DocPage[] = DOCS_NAV.flatMap((g) => g.pages);

/** Group heading for a slug — used by the docs search to show context. */
export function groupOf(slug: string): string | undefined {
  return DOCS_NAV.find((g) => g.pages.some((p) => p.slug === slug))?.heading;
}

export function prevNext(slug: string): {
  prev?: DocPage;
  next?: DocPage;
} {
  const idx = FLAT_DOCS.findIndex((p) => p.slug === slug);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? FLAT_DOCS[idx - 1] : undefined,
    next: idx < FLAT_DOCS.length - 1 ? FLAT_DOCS[idx + 1] : undefined,
  };
}
