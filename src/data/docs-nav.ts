/* ============================================================
   Manual sidebar source-of-truth for /docs. Small enough to
   hand-author for 8 pages; promote to filesystem-scan in v2.
   ============================================================ */

export type DocPage = {
  slug: string;
  title: string;
  description?: string;
};

export type DocsGroup = {
  heading: string;
  pages: DocPage[];
};

export const DOCS_NAV: DocsGroup[] = [
  {
    heading: "Start",
    pages: [
      {
        slug: "/docs",
        title: "Overview",
        description: "What Cantila is and how the docs are organised.",
      },
      {
        slug: "/docs/getting-started",
        title: "Getting started",
        description: "Sign up, ship your first project from chat.",
      },
    ],
  },
  {
    heading: "Deploy",
    pages: [
      {
        slug: "/docs/deploy/chat",
        title: "Cantila Deploy (chat)",
        description: "Drop files, get a URL — the conversational front door.",
      },
      {
        slug: "/docs/deploy/git",
        title: "Push-to-deploy (git)",
        description: "Connect a repo for branch + preview deploys.",
      },
    ],
  },
  {
    heading: "Build",
    pages: [
      {
        slug: "/docs/cli",
        title: "The Cantila CLI",
        description: "`cantila` — install, log in, ship.",
      },
      {
        slug: "/docs/mcp",
        title: "Cantila MCP server",
        description: "Add Cantila to Claude in 30 seconds.",
      },
      {
        slug: "/docs/auto-wired",
        title: "Auto-wired services",
        description: "The DB, mailbox, and SMS number every project ships with.",
      },
    ],
  },
  {
    heading: "Operate",
    pages: [
      {
        slug: "/docs/billing",
        title: "Plans, billing, invoices",
        description: "Stripe-backed plans, metered overage, the Billing Portal.",
      },
    ],
  },
];

export const FLAT_DOCS: DocPage[] = DOCS_NAV.flatMap((g) => g.pages);

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
