/* ============================================================
   Cantila Console — mock data layer
   Deterministic fixtures for the MVP prototype. No network, no
   randomness at render time (metrics use a seeded RNG so server
   and client always agree — see rng/series below).
   ============================================================ */

import type {
  Activity,
  Database,
  Deployment,
  Domain,
  EnvVar,
  LogLine,
  Project,
  Region,
  Template,
  TeamMember,
  UsageMetric,
} from "./types";

/* ---------- deterministic number generation ---------- */

function rng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(
  seed: number,
  len: number,
  base: number,
  swing: number,
  opts: { trend?: number; min?: number; max?: number } = {},
): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    v += (r() - 0.5) * swing + (opts.trend ?? 0);
    if (opts.min !== undefined) v = Math.max(opts.min, v);
    if (opts.max !== undefined) v = Math.min(opts.max, v);
    out.push(Math.round(v * 10) / 10);
  }
  return out;
}

/* ---------- regions ---------- */

export const REGIONS: Record<Region, { city: string; flag: string }> = {
  fsn1: { city: "Falkenstein, DE", flag: "EU" },
  hel1: { city: "Helsinki, FI", flag: "EU" },
  ash: { city: "Ashburn, US", flag: "US" },
};

/* ---------- account ---------- */

export const ACCOUNT = {
  org: "JJ Cantila",
  handle: "jjcantila",
  plan: "Pro",
  email: "jjcantila0728@gmail.com",
  initials: "JC",
};

/* ---------- projects ---------- */

export const projects: Project[] = [
  {
    id: "aurora-store",
    name: "aurora-store",
    runtime: "Next.js",
    region: "fsn1",
    status: "live",
    url: "aurora-store.cantila.app",
    repo: "jjcantila/aurora-store",
    description: "Headless storefront — the flagship demo shop.",
    lastDeployAt: "2h ago",
    createdAt: "Mar 2026",
    vcpu: 2,
    memoryMb: 2048,
    diskGb: 10,
    autoSleep: false,
    alwaysOn: true,
    type: "Web app",
    databaseId: "db-aurora",
    metrics: {
      cpu: series(11, 24, 28, 18, { min: 4, max: 92 }),
      memory: series(12, 24, 54, 10, { min: 30, max: 88 }),
      requests: series(13, 24, 1400, 900, { min: 120 }),
      latency: series(14, 24, 88, 40, { min: 30, max: 260 }),
      uptimePct: 99.98,
      reqPerMin: 412,
    },
  },
  {
    id: "n8n-ops",
    name: "n8n-ops",
    runtime: "Docker",
    region: "hel1",
    status: "live",
    url: "n8n-ops.cantila.app",
    description: "Always-on n8n instance running 14 internal automations.",
    lastDeployAt: "6d ago",
    createdAt: "Feb 2026",
    vcpu: 2,
    memoryMb: 4096,
    diskGb: 20,
    autoSleep: false,
    alwaysOn: true,
    type: "AI agent",
    databaseId: "db-n8n",
    metrics: {
      cpu: series(21, 24, 16, 14, { min: 2, max: 70 }),
      memory: series(22, 24, 62, 8, { min: 40, max: 90 }),
      requests: series(23, 24, 220, 160, { min: 10 }),
      latency: series(24, 24, 140, 60, { min: 40, max: 380 }),
      uptimePct: 100,
      reqPerMin: 47,
    },
  },
  {
    id: "librechat",
    name: "librechat",
    runtime: "Docker",
    region: "fsn1",
    status: "live",
    url: "chat.cantila.app",
    description: "LibreChat agent UI, wired to a private model gateway.",
    lastDeployAt: "3d ago",
    createdAt: "Apr 2026",
    vcpu: 2,
    memoryMb: 4096,
    diskGb: 15,
    autoSleep: false,
    alwaysOn: true,
    type: "AI agent",
    databaseId: "db-librechat",
    metrics: {
      cpu: series(31, 24, 34, 22, { min: 6, max: 95 }),
      memory: series(32, 24, 70, 9, { min: 48, max: 94 }),
      requests: series(33, 24, 540, 380, { min: 30 }),
      latency: series(34, 24, 210, 90, { min: 60, max: 520 }),
      uptimePct: 99.94,
      reqPerMin: 119,
    },
  },
  {
    id: "pulse-api",
    name: "pulse-api",
    runtime: "Node.js",
    region: "ash",
    status: "live",
    url: "api.pulsemetrics.io",
    repo: "jjcantila/pulse-api",
    description: "REST API for the Pulse mobile app backend.",
    lastDeployAt: "5h ago",
    createdAt: "Jan 2026",
    vcpu: 1,
    memoryMb: 1024,
    diskGb: 5,
    autoSleep: false,
    alwaysOn: true,
    type: "API",
    databaseId: "db-pulse",
    metrics: {
      cpu: series(41, 24, 22, 16, { min: 3, max: 80 }),
      memory: series(42, 24, 44, 11, { min: 24, max: 78 }),
      requests: series(43, 24, 2600, 1500, { min: 400 }),
      latency: series(44, 24, 62, 28, { min: 22, max: 190 }),
      uptimePct: 99.99,
      reqPerMin: 731,
    },
  },
  {
    id: "invoice-agent",
    name: "invoice-agent",
    runtime: "Python",
    region: "fsn1",
    status: "building",
    url: "invoice-agent.cantila.app",
    description: "Built in Claude, shipped via MCP — parses inbound invoices.",
    lastDeployAt: "deploying…",
    createdAt: "May 2026",
    vcpu: 1,
    memoryMb: 1024,
    diskGb: 5,
    autoSleep: true,
    alwaysOn: false,
    type: "Worker",
    metrics: {
      cpu: series(51, 24, 12, 20, { min: 0, max: 88 }),
      memory: series(52, 24, 31, 14, { min: 12, max: 70 }),
      requests: series(53, 24, 40, 60, { min: 0 }),
      latency: series(54, 24, 0, 0, { min: 0 }),
      uptimePct: 0,
      reqPerMin: 0,
    },
  },
  {
    id: "ghost-journal",
    name: "ghost-journal",
    runtime: "Docker",
    region: "hel1",
    status: "sleeping",
    url: "journal.cantila.app",
    description: "Ghost blog — auto-sleeps when idle, wakes on first request.",
    lastDeployAt: "21d ago",
    createdAt: "Dec 2025",
    vcpu: 1,
    memoryMb: 1024,
    diskGb: 8,
    autoSleep: true,
    alwaysOn: false,
    type: "Web app",
    databaseId: "db-ghost",
    metrics: {
      cpu: series(61, 24, 4, 6, { min: 0, max: 40 }),
      memory: series(62, 24, 18, 6, { min: 8, max: 44 }),
      requests: series(63, 24, 30, 50, { min: 0 }),
      latency: series(64, 24, 90, 50, { min: 0, max: 300 }),
      uptimePct: 99.7,
      reqPerMin: 3,
    },
  },
  {
    id: "metabase",
    name: "metabase",
    runtime: "Docker",
    region: "fsn1",
    status: "crashed",
    url: "metrics.cantila.app",
    description: "Self-hosted Metabase — crashed on last deploy (OOM).",
    lastDeployAt: "40m ago",
    createdAt: "Apr 2026",
    vcpu: 1,
    memoryMb: 1024,
    diskGb: 10,
    autoSleep: false,
    alwaysOn: true,
    type: "Web app",
    metrics: {
      cpu: series(71, 24, 48, 30, { min: 0, max: 100 }),
      memory: series(72, 24, 86, 12, { min: 60, max: 100, trend: 0.4 }),
      requests: series(73, 24, 80, 70, { min: 0 }),
      latency: series(74, 24, 320, 160, { min: 0, max: 900 }),
      uptimePct: 97.1,
      reqPerMin: 0,
    },
  },
];

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

/* ---------- deployments ---------- */

export const deployments: Deployment[] = [
  // aurora-store
  { id: "dpl_9f2a", projectId: "aurora-store", status: "live", trigger: "git", branch: "main", commitHash: "8c1d4e2", commitMessage: "Add seasonal banner + fix cart rounding", author: "JJ Cantila", durationSec: 74, createdAt: "2h ago" },
  { id: "dpl_8b71", projectId: "aurora-store", status: "superseded", trigger: "git", branch: "main", commitHash: "1a9f0c3", commitMessage: "Bump checkout SDK to 4.2", author: "JJ Cantila", durationSec: 81, createdAt: "1d ago" },
  { id: "dpl_7c40", projectId: "aurora-store", status: "superseded", trigger: "chat", branch: "main", commitHash: "c33b7a1", commitMessage: "Chat Deploy: switch image CDN", author: "JJ Cantila", durationSec: 69, createdAt: "3d ago" },
  { id: "dpl_6d19", projectId: "aurora-store", status: "failed", trigger: "git", branch: "main", commitHash: "f0e8d22", commitMessage: "Refactor product grid (build error)", author: "Priya Raman", durationSec: 38, createdAt: "4d ago" },
  // invoice-agent
  { id: "dpl_5e88", projectId: "invoice-agent", status: "building", trigger: "mcp", branch: "main", commitHash: "a7b2f10", commitMessage: "Ship from Claude — invoice parser v1", author: "JJ Cantila", durationSec: 0, createdAt: "just now" },
  // pulse-api
  { id: "dpl_4f63", projectId: "pulse-api", status: "live", trigger: "cli", branch: "main", commitHash: "3d5c9e0", commitMessage: "Add /v2/devices endpoint + rate limit", author: "JJ Cantila", durationSec: 52, createdAt: "5h ago" },
  { id: "dpl_3a21", projectId: "pulse-api", status: "rolled-back", trigger: "git", branch: "main", commitHash: "bb14709", commitMessage: "Migrate to new auth middleware", author: "Marco L…", durationSec: 60, createdAt: "2d ago" },
  // librechat
  { id: "dpl_2c54", projectId: "librechat", status: "live", trigger: "chat", branch: "release", commitHash: "e91a0d4", commitMessage: "Chat Deploy: bump LibreChat to 0.7.6", author: "JJ Cantila", durationSec: 96, createdAt: "3d ago" },
  // metabase
  { id: "dpl_1b07", projectId: "metabase", status: "failed", trigger: "git", branch: "main", commitHash: "d4c8a55", commitMessage: "Enable embedding (container OOM-killed)", author: "JJ Cantila", durationSec: 121, createdAt: "40m ago" },
];

export function getDeployments(projectId: string): Deployment[] {
  return deployments.filter((d) => d.projectId === projectId);
}

/* ---------- environment variables ---------- */

const envByProject: Record<string, EnvVar[]> = {
  "aurora-store": [
    { key: "DATABASE_URL", preview: "postgres://•••@db-aurora", scope: "all", updatedAt: "2h ago", secret: true },
    { key: "NEXT_PUBLIC_SITE_URL", preview: "https://aurora-store.cantila.app", scope: "production", updatedAt: "12d ago", secret: false },
    { key: "STRIPE_SECRET_KEY", preview: "sk_live_••••••••4xQ2", scope: "production", updatedAt: "5d ago", secret: true },
    { key: "STRIPE_SECRET_KEY", preview: "sk_test_••••••••91aF", scope: "preview", updatedAt: "5d ago", secret: true },
    { key: "RESEND_FROM", preview: "orders@aurora-store.com", scope: "all", updatedAt: "12d ago", secret: false },
    { key: "IMAGE_CDN", preview: "cdn.cantila.app/aurora", scope: "all", updatedAt: "3d ago", secret: false },
  ],
  "invoice-agent": [
    { key: "ANTHROPIC_API_KEY", preview: "sk-ant-••••••••7c0d", scope: "all", updatedAt: "just now", secret: true },
    { key: "INBOUND_WEBHOOK_SECRET", preview: "whsec_••••••••2a9b", scope: "production", updatedAt: "just now", secret: true },
    { key: "MAIL_PARSE_ADDR", preview: "invoices@in.cantila.app", scope: "all", updatedAt: "just now", secret: false },
    { key: "STORAGE_BUCKET", preview: "cantila-store/invoice-agent", scope: "all", updatedAt: "just now", secret: false },
  ],
  "pulse-api": [
    { key: "DATABASE_URL", preview: "postgres://•••@db-pulse", scope: "all", updatedAt: "5h ago", secret: true },
    { key: "JWT_SECRET", preview: "••••••••••••e1f7", scope: "production", updatedAt: "9d ago", secret: true },
    { key: "REDIS_URL", preview: "redis://•••@cache-pulse", scope: "all", updatedAt: "9d ago", secret: true },
    { key: "SMS_API_KEY", preview: "ct_sms_••••••••88de", scope: "production", updatedAt: "1d ago", secret: true },
  ],
};

const envDefault: EnvVar[] = [
  { key: "NODE_ENV", preview: "production", scope: "production", updatedAt: "deploy", secret: false },
  { key: "PORT", preview: "3000", scope: "all", updatedAt: "deploy", secret: false },
];

export function getEnvVars(projectId: string): EnvVar[] {
  return envByProject[projectId] ?? envDefault;
}

/* ---------- runtime logs ---------- */

const logBank: Record<string, LogLine[]> = {
  "aurora-store": [
    { ts: "14:42:09.114", level: "info", source: "router", message: "GET /products/aurora-tote 200 — 41ms" },
    { ts: "14:42:09.880", level: "info", source: "router", message: "GET /api/cart 200 — 22ms" },
    { ts: "14:42:11.207", level: "info", source: "router", message: "POST /api/checkout 200 — 188ms" },
    { ts: "14:42:11.301", level: "info", source: "stripe", message: "payment_intent.succeeded — pi_3Qk…7Hx" },
    { ts: "14:42:12.554", level: "info", source: "mail", message: "Order receipt queued → orders@aurora-store.com" },
    { ts: "14:42:14.770", level: "warn", source: "cdn", message: "cache MISS /img/hero-spring.webp (revalidating)" },
    { ts: "14:42:16.018", level: "info", source: "router", message: "GET / 200 — 33ms" },
    { ts: "14:42:18.443", level: "debug", source: "edge", message: "ISR revalidate /products (28 paths)" },
  ],
  metabase: [
    { ts: "13:58:02.671", level: "info", source: "jvm", message: "Metabase starting — build 0.49.6" },
    { ts: "13:58:09.330", level: "info", source: "db", message: "Connected to app database (postgres)" },
    { ts: "13:58:21.901", level: "warn", source: "jvm", message: "Heap usage 91% — GC pressure rising" },
    { ts: "13:58:24.118", level: "warn", source: "jvm", message: "Heap usage 97% — allocation stalls" },
    { ts: "13:58:25.004", level: "error", source: "kernel", message: "Container OOM-killed — memory.limit 1024Mi exceeded" },
    { ts: "13:58:25.110", level: "error", source: "agent", message: "Process exited (137). Restart 3/3 — backing off." },
    { ts: "13:58:25.260", level: "build", source: "cantila", message: "AI troubleshooting: likely under-provisioned memory →" },
    { ts: "13:58:25.261", level: "build", source: "cantila", message: "  suggested fix — resize to 2 GB RAM, then redeploy." },
  ],
};

const logDefault: LogLine[] = [
  { ts: "14:40:01.220", level: "info", source: "agent", message: "Health check OK — 200 in 12ms" },
  { ts: "14:40:31.450", level: "info", source: "router", message: "GET / 200 — 19ms" },
  { ts: "14:41:01.118", level: "info", source: "agent", message: "Health check OK — 200 in 9ms" },
  { ts: "14:41:22.770", level: "debug", source: "runtime", message: "Worker heartbeat — queue depth 0" },
  { ts: "14:41:31.330", level: "info", source: "agent", message: "Health check OK — 200 in 11ms" },
  { ts: "14:42:01.902", level: "info", source: "agent", message: "Health check OK — 200 in 10ms" },
];

export function getLogs(projectId: string): LogLine[] {
  return logBank[projectId] ?? logDefault;
}

/* ---------- domains ---------- */

export const domains: Domain[] = [
  { name: "aurora-store.cantila.app", kind: "subdomain", projectId: "aurora-store", ssl: "active", dns: "wired", primary: false },
  { name: "aurorastore.shop", kind: "custom", projectId: "aurora-store", ssl: "active", dns: "wired", primary: true },
  { name: "n8n-ops.cantila.app", kind: "subdomain", projectId: "n8n-ops", ssl: "active", dns: "wired", primary: true },
  { name: "chat.cantila.app", kind: "subdomain", projectId: "librechat", ssl: "active", dns: "wired", primary: true },
  { name: "api.pulsemetrics.io", kind: "custom", projectId: "pulse-api", ssl: "active", dns: "external", primary: true },
  { name: "invoice-agent.cantila.app", kind: "subdomain", projectId: "invoice-agent", ssl: "issuing", dns: "wired", primary: true },
  { name: "journal.cantila.app", kind: "subdomain", projectId: "ghost-journal", ssl: "active", dns: "wired", primary: true },
  { name: "metrics.cantila.app", kind: "subdomain", projectId: "metabase", ssl: "active", dns: "wired", primary: true },
];

export function getDomains(projectId: string): Domain[] {
  return domains.filter((d) => d.projectId === projectId);
}

/* ---------- registrar inventory (Cantila Domains) ---------- */

export const registrarDomains = [
  { name: "aurorastore.shop", registrar: "Cantila Domains", renewsAt: "Mar 14, 2027", autoRenew: true, privacy: true, price: "$22 / yr" },
  { name: "pulsemetrics.io", registrar: "Cantila Domains", renewsAt: "Jan 02, 2027", autoRenew: true, privacy: true, price: "$38 / yr" },
  { name: "cantila.dev", registrar: "Cantila Domains", renewsAt: "Nov 28, 2026", autoRenew: true, privacy: true, price: "$14 / yr" },
];

/* ---------- databases ---------- */

export const databases: Database[] = [
  { id: "db-aurora", name: "aurora-pg", engine: "postgres", version: "16.3", status: "healthy", region: "fsn1", sizeGb: 10, usedGb: 3.4, plan: "Standard", linkedProjectId: "aurora-store", backupsAt: "03:00 daily" },
  { id: "db-pulse", name: "pulse-pg", engine: "postgres", version: "16.3", status: "healthy", region: "ash", sizeGb: 25, usedGb: 11.2, plan: "Standard", linkedProjectId: "pulse-api", backupsAt: "03:00 daily" },
  { id: "cache-pulse", name: "pulse-cache", engine: "redis", version: "7.4", status: "healthy", region: "ash", sizeGb: 1, usedGb: 0.2, plan: "Micro", linkedProjectId: "pulse-api", backupsAt: "snapshot 6h" },
  { id: "db-n8n", name: "n8n-pg", engine: "postgres", version: "16.3", status: "healthy", region: "hel1", sizeGb: 10, usedGb: 1.9, plan: "Standard", linkedProjectId: "n8n-ops", backupsAt: "03:00 daily" },
  { id: "db-librechat", name: "librechat-mongo", engine: "mongodb", version: "7.0", status: "healthy", region: "fsn1", sizeGb: 10, usedGb: 2.7, plan: "Standard", linkedProjectId: "librechat", backupsAt: "03:00 daily" },
  { id: "db-ghost", name: "ghost-mysql", engine: "mysql", version: "8.4", status: "sleeping", region: "hel1", sizeGb: 5, usedGb: 0.6, plan: "Micro", linkedProjectId: "ghost-journal", backupsAt: "03:00 daily" },
];

export function getDatabase(id?: string): Database | undefined {
  return id ? databases.find((d) => d.id === id) : undefined;
}

/* ---------- template marketplace ---------- */

export const templates: Template[] = [
  { id: "n8n", name: "n8n", category: "AI agents", blurb: "Workflow automation with 400+ integrations.", glyph: "n", deploys: "12.4k", tags: ["automation", "agent"], featured: true },
  { id: "librechat", name: "LibreChat", category: "AI agents", blurb: "Self-hosted multi-model chat UI.", glyph: "L", deploys: "8.1k", tags: ["chat", "llm"], featured: true },
  { id: "flowise", name: "Flowise", category: "AI agents", blurb: "Drag-and-drop LLM app builder.", glyph: "F", deploys: "5.6k", tags: ["llm", "no-code"] },
  { id: "openclaw", name: "OpenClaw", category: "AI agents", blurb: "Autonomous browsing agent runtime.", glyph: "O", deploys: "2.2k", tags: ["agent", "browser"] },
  { id: "ghost", name: "Ghost", category: "CMS & sites", blurb: "Modern publishing & newsletters.", glyph: "G", deploys: "19.7k", tags: ["cms", "blog"], featured: true },
  { id: "wordpress", name: "WordPress", category: "CMS & sites", blurb: "The classic CMS, container-packaged.", glyph: "W", deploys: "31.0k", tags: ["cms", "php"] },
  { id: "supabase", name: "Supabase", category: "Databases", blurb: "Postgres + auth + storage + realtime.", glyph: "S", deploys: "14.3k", tags: ["postgres", "backend"], featured: true },
  { id: "pocketbase", name: "PocketBase", category: "Databases", blurb: "One-file backend in a single binary.", glyph: "P", deploys: "6.9k", tags: ["backend", "sqlite"] },
  { id: "metabase", name: "Metabase", category: "Analytics", blurb: "Business intelligence & dashboards.", glyph: "M", deploys: "9.4k", tags: ["bi", "dashboards"] },
  { id: "umami", name: "Umami", category: "Analytics", blurb: "Privacy-first web analytics.", glyph: "U", deploys: "7.7k", tags: ["analytics", "privacy"] },
  { id: "uptime-kuma", name: "Uptime Kuma", category: "Dev tools", blurb: "Self-hosted uptime monitoring.", glyph: "K", deploys: "10.2k", tags: ["monitoring"] },
  { id: "gitea", name: "Gitea", category: "Dev tools", blurb: "Lightweight self-hosted Git service.", glyph: "t", deploys: "4.8k", tags: ["git", "vcs"] },
];

/* ---------- team ---------- */

export const team: TeamMember[] = [
  { name: "JJ Cantila", email: "jjcantila0728@gmail.com", role: "Owner", initials: "JC", lastActive: "now", you: true },
  { name: "Priya Raman", email: "priya@cantila.dev", role: "Admin", initials: "PR", lastActive: "18m ago" },
  { name: "Marco Léon", email: "marco@cantila.dev", role: "Developer", initials: "ML", lastActive: "2h ago" },
  { name: "Dani Okonkwo", email: "dani@cantila.dev", role: "Developer", initials: "DO", lastActive: "1d ago" },
  { name: "Sage Whitfield", email: "sage@northrun.agency", role: "Viewer", initials: "SW", lastActive: "4d ago" },
];

/* ---------- activity feed ---------- */

export const activity: Activity[] = [
  { id: "a1", kind: "deploy", title: "Deploy shipped from Claude", detail: "invoice-agent · via Cantila MCP server", at: "just now", project: "invoice-agent" },
  { id: "a2", kind: "alert", title: "metabase crashed", detail: "Container OOM-killed — AI troubleshooting attached a fix", at: "40m ago", project: "metabase" },
  { id: "a3", kind: "deploy", title: "aurora-store deployed", detail: "8c1d4e2 · Add seasonal banner + fix cart rounding", at: "2h ago", project: "aurora-store" },
  { id: "a4", kind: "deploy", title: "pulse-api deployed via CLI", detail: "3d5c9e0 · Add /v2/devices endpoint", at: "5h ago", project: "pulse-api" },
  { id: "a5", kind: "database", title: "Backup completed", detail: "pulse-pg · 11.2 GB snapshot → object storage", at: "11h ago" },
  { id: "a6", kind: "domain", title: "SSL renewed", detail: "aurorastore.shop · Let's Encrypt — valid 90d", at: "1d ago" },
  { id: "a7", kind: "member", title: "Marco Léon joined the team", detail: "Invited as Developer by JJ Cantila", at: "2d ago" },
  { id: "a8", kind: "billing", title: "Usage threshold 80%", detail: "Compute hours — Pro plan allowance", at: "3d ago" },
];

/* ---------- billing / usage ---------- */

export const usage: UsageMetric[] = [
  { label: "Compute hours", used: 1840, limit: 2300, unit: "hrs" },
  { label: "Bandwidth", used: 412, limit: 600, unit: "GB" },
  { label: "Object storage", used: 28, limit: 50, unit: "GB" },
  { label: "Email sent", used: 6200, limit: 25000, unit: "msgs" },
  { label: "Build minutes", used: 318, limit: 1000, unit: "min" },
];

export const invoices = [
  { id: "INV-2026-05", period: "May 2026", amount: "$74.20", status: "Open", note: "Pro plan + metered usage" },
  { id: "INV-2026-04", period: "Apr 2026", amount: "$61.55", status: "Paid", note: "Pro plan + metered usage" },
  { id: "INV-2026-03", period: "Mar 2026", amount: "$58.90", status: "Paid", note: "Pro plan + metered usage" },
  { id: "INV-2026-02", period: "Feb 2026", amount: "$35.00", status: "Paid", note: "Pro plan" },
];

export const planTiers = [
  { name: "Hobby", price: "$0", tagline: "Side projects", current: false },
  { name: "Starter", price: "$10", tagline: "Ship a real product", current: false },
  { name: "Pro", price: "$35", tagline: "Serious solo & small teams", current: true },
  { name: "Agency", price: "$99+", tagline: "Resellers & agencies", current: false },
];

/* ---------- dashboard rollups ---------- */

export const dashboardStats = {
  liveProjects: projects.filter((p) => p.status === "live").length,
  totalProjects: projects.length,
  deploysThisWeek: 23,
  reqToday: "1.27M",
  avgUptime: 99.96,
  monthSpend: "$74.20",
};

/* fleet nodes — the Cantila data plane */
export const fleet = [
  { id: "node-fsn-01", region: "fsn1" as Region, apps: 14, cpu: 58, mem: 64, status: "healthy" },
  { id: "node-fsn-02", region: "fsn1" as Region, apps: 11, cpu: 41, mem: 52, status: "healthy" },
  { id: "node-hel-01", region: "hel1" as Region, apps: 9, cpu: 33, mem: 47, status: "healthy" },
  { id: "node-ash-01", region: "ash" as Region, apps: 7, cpu: 72, mem: 69, status: "healthy" },
];
