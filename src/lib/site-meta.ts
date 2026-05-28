/* ============================================================
   Shared marketing-site metadata — host names, the product
   catalog, the nav structure and the footer columns. Imported
   wherever the public surface needs to render a link list so
   we don't drift across the header, the footer, the docs and
   the sitemap.
   ============================================================ */

import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  MessageSquare,
  Inbox,
  Phone,
  Database,
  Globe,
  Brain,
  Workflow,
  Sparkles,
} from "lucide-react";

export const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
export const CONSOLE_HOST =
  process.env.CANTILA_CONSOLE_HOST ?? `console.${PUBLIC_HOST}`;
export const API_HOST = `api.${PUBLIC_HOST}`;

export const SITE_NAME = "Cantila";
export const SITE_TAGLINE = "Ship anything, live — from one chat.";
export const SITE_LONG =
  "The VPS-powered hosting cloud where websites, apps, and AI agents ship from a single chat — with the domain, email, SMS, and database already wired in.";

/** Absolute URL of the live console. Used by the marketing header's
 *  "Sign in" / "Sign up" CTAs so a click on cantila.app sends the user
 *  to the auth pages on their natural origin. */
export function consoleUrl(path: string): string {
  if (process.env.NODE_ENV !== "production") return path;
  return `https://${PUBLIC_HOST}${path}`;
}

export type Product = {
  slug: string;
  name: string;
  short: string;
  icon: LucideIcon;
  phase: "live" | "phase-2" | "phase-3";
};

/** The eight Cantila X products from brand/naming.md §"The product family",
 *  ordered to match marketing/footer columns. `phase` matches plan §6 and
 *  is surfaced as the "honest about the seams" banner on each product
 *  page (brand/voice.md §4). */
export const PRODUCTS: Product[] = [
  {
    slug: "host",
    name: "Cantila Host",
    short: "The hosting engine — VPS fleet, containers, deploys.",
    icon: Boxes,
    phase: "live",
  },
  {
    slug: "deploy",
    name: "Cantila Deploy",
    short: "Drop files in. Cantila detects the stack. You get a URL.",
    icon: Sparkles,
    phase: "live",
  },
  {
    slug: "data",
    name: "Cantila Data",
    short: "Postgres, MySQL, Mongo, Redis — one click, in your env.",
    icon: Database,
    phase: "live",
  },
  {
    slug: "domains",
    name: "Cantila Domains",
    short: "Registrar + DNS. Auto-wired SSL and email records.",
    icon: Globe,
    phase: "live",
  },
  {
    slug: "agents",
    name: "Cantila Agents",
    short: "An always-on operations brain for your fleet.",
    icon: Brain,
    phase: "live",
  },
  {
    slug: "automations",
    name: "Cantila Automations",
    short: "n8n + OpenClaw, native — one builder, one login.",
    icon: Workflow,
    phase: "live",
  },
  {
    slug: "mail",
    name: "Cantila Mail",
    short: "Full email — send, receive, mailboxes, IMAP. First-party MTA.",
    icon: Inbox,
    phase: "phase-2",
  },
  {
    slug: "sms",
    name: "Cantila SMS",
    short: "Send and receive SMS and voice from numbers you own.",
    icon: Phone,
    phase: "phase-3",
  },
];

export const PRODUCT_BY_SLUG: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.slug, p]),
);

export type FooterColumn = {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Cantila Host", href: "/products/host" },
      { label: "Cantila Deploy", href: "/products/deploy" },
      { label: "Cantila Data", href: "/products/data" },
      { label: "Cantila Domains", href: "/products/domains" },
      { label: "Cantila Mail", href: "/products/mail" },
      { label: "Cantila SMS", href: "/products/sms" },
      { label: "Cantila Agents", href: "/products/agents" },
      { label: "Cantila Automations", href: "/products/automations" },
    ],
  },
  {
    heading: "Build",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Cantila MCP", href: "/mcp" },
      { label: "Docs", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Acceptable use", href: "/legal/aup" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "Subprocessors", href: "/legal/subprocessors" },
    ],
  },
];
