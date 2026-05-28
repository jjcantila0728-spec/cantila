/* ============================================================
   Cantila Console — mock data layer
   Deterministic fixtures for the MVP prototype. No network, no
   randomness at render time (metrics use a seeded RNG so server
   and client always agree — see rng/series below).
   ============================================================ */

import type {
  Activity,
  Alert,
  CheckStatus,
  Database,
  Deployment,
  Domain,
  EmailMessage,
  EnvVar,
  Incident,
  LogLine,
  MailAlias,
  MailDomain,
  Mailbox,
  MailEvent,
  PhoneNumber,
  Project,
  Region,
  SmsConversation,
  SmsMessage,
  StatusComponent,
  StorageBucket,
  Template,
  TeamMember,
  UptimeMonitor,
  UsageMetric,
  Verification,
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
  { id: "a9", kind: "sms", title: "Verification code delivered", detail: "pulse-api · OTP sent via Cantila SMS", at: "3m ago", project: "pulse-api" },
  { id: "a10", kind: "mail", title: "Inbound invoice parsed", detail: "invoices@in.cantila.app → invoice-agent webhook", at: "8m ago", project: "invoice-agent" },
  { id: "a2", kind: "alert", title: "metabase crashed", detail: "Container OOM-killed — AI troubleshooting attached a fix", at: "40m ago", project: "metabase" },
  { id: "a3", kind: "deploy", title: "aurora-store deployed", detail: "8c1d4e2 · Add seasonal banner + fix cart rounding", at: "2h ago", project: "aurora-store" },
  { id: "a4", kind: "deploy", title: "pulse-api deployed via CLI", detail: "3d5c9e0 · Add /v2/devices endpoint", at: "5h ago", project: "pulse-api" },
  { id: "a5", kind: "database", title: "Backup completed", detail: "pulse-pg · 11.2 GB snapshot → object storage", at: "11h ago" },
  { id: "a6", kind: "domain", title: "SSL renewed", detail: "aurorastore.shop · Let's Encrypt — valid 90d", at: "1d ago" },
  { id: "a7", kind: "member", title: "Marco Léon joined the team", detail: "Invited as Developer by JJ Cantila", at: "2d ago" },
  { id: "a8", kind: "billing", title: "Usage threshold 80%", detail: "Compute hours — Pro plan allowance", at: "3d ago" },
];

/** Best-effort deep link for an activity event — used by the feed and notifications. */
export function activityHref(a: Activity): string {
  switch (a.kind) {
    case "deploy":
      return a.project && getProject(a.project)
        ? `/projects/${a.project}`
        : "/projects";
    case "alert":
      return "/monitoring";
    case "database":
      return "/databases";
    case "domain":
      return "/domains";
    case "billing":
      return "/billing";
    case "member":
      return "/team";
    case "mail":
      return "/mail";
    case "sms":
      return "/sms";
    default:
      return "/dashboard";
  }
}

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

/* ============================================================
   Cantila Mail — send-and-receive email provider fixtures
   ============================================================ */

export const mailDomains: MailDomain[] = [
  {
    domain: "cantila.dev",
    spf: "ok",
    dkim: "ok",
    dmarc: "ok",
    mx: "ok",
    reputation: 98,
    sent30d: 4280,
    purpose: "Team mailboxes & company mail",
  },
  {
    domain: "aurorastore.shop",
    spf: "ok",
    dkim: "ok",
    dmarc: "ok",
    mx: "ok",
    reputation: 96,
    sent30d: 18640,
    purpose: "aurora-store order & shipping receipts",
  },
  {
    domain: "pulsemetrics.io",
    spf: "ok",
    dkim: "ok",
    dmarc: "pending",
    mx: "ok",
    reputation: 91,
    sent30d: 2390,
    purpose: "pulse-api transactional email",
  },
];

export const mailboxes: Mailbox[] = [
  { address: "jj@cantila.dev", displayName: "JJ Cantila", domain: "cantila.dev", kind: "personal", usedMb: 2140, quotaMb: 10240, status: "active", member: "JJ Cantila" },
  { address: "priya@cantila.dev", displayName: "Priya Raman", domain: "cantila.dev", kind: "personal", usedMb: 6830, quotaMb: 10240, status: "active", member: "Priya Raman" },
  { address: "marco@cantila.dev", displayName: "Marco Léon", domain: "cantila.dev", kind: "personal", usedMb: 3120, quotaMb: 10240, status: "active", member: "Marco Léon" },
  { address: "dani@cantila.dev", displayName: "Dani Okonkwo", domain: "cantila.dev", kind: "personal", usedMb: 970, quotaMb: 5120, status: "active", member: "Dani Okonkwo" },
  { address: "hello@cantila.dev", displayName: "Support inbox", domain: "cantila.dev", kind: "shared", usedMb: 4460, quotaMb: 20480, status: "active" },
  { address: "orders@aurorastore.shop", displayName: "Order receipts", domain: "aurorastore.shop", kind: "shared", usedMb: 1280, quotaMb: 5120, status: "active" },
  { address: "newsletter@aurorastore.shop", displayName: "Newsletter sender", domain: "aurorastore.shop", kind: "shared", usedMb: 0, quotaMb: 5120, status: "provisioning" },
];

export const mailAliases: MailAlias[] = [
  { address: "support@cantila.dev", target: "hello@cantila.dev", kind: "alias" },
  { address: "jobs@cantila.dev", target: "hello@cantila.dev", kind: "alias" },
  { address: "press@cantila.dev", target: "jj@cantila.dev", kind: "forward" },
  { address: "*@cantila.dev", target: "hello@cantila.dev", kind: "catch-all" },
  { address: "invoices@in.cantila.app", target: "invoice-agent webhook", kind: "parse", projectId: "invoice-agent" },
  { address: "billing@aurorastore.shop", target: "orders@aurorastore.shop", kind: "alias" },
];

export const mailEvents: MailEvent[] = [
  { id: "me1", direction: "outbound", subject: "Your aurora-store order #A-7741", party: "kara.lin@gmail.com", status: "delivered", projectId: "aurora-store", at: "2m ago" },
  { id: "me2", direction: "inbound", subject: "Invoice 4471 — Northwind Supplies", party: "ap@northwind.co", status: "received", projectId: "invoice-agent", at: "8m ago" },
  { id: "me3", direction: "outbound", subject: "Verify your email address", party: "devon@hey.com", status: "delivered", projectId: "pulse-api", at: "15m ago" },
  { id: "me4", direction: "outbound", subject: "cantila.dev — May product update", party: "list · 1,204 recipients", status: "queued", at: "24m ago" },
  { id: "me5", direction: "outbound", subject: "Your order has shipped", party: "t.morrow@outlok.com", status: "bounced", projectId: "aurora-store", at: "41m ago" },
  { id: "me6", direction: "inbound", subject: "Re: partnership enquiry", party: "ben@foundry.studio", status: "received", at: "1h ago" },
  { id: "me7", direction: "outbound", subject: "Reset your password", party: "amelia@proton.me", status: "delivered", projectId: "pulse-api", at: "1h ago" },
  { id: "me8", direction: "outbound", subject: "Spring sale — 20% off everything", party: "j.okafor@gmail.com", status: "complaint", projectId: "aurora-store", at: "3h ago" },
];

/* email sent / day — last 14 days */
export const mailVolume: number[] = series(401, 14, 760, 420, { min: 140 });

export const mailStats = {
  sent30d: 25310,
  inbound30d: 3140,
  deliveryRate: 99.2,
  openRate: 47.8,
};

/* ============================================================
   Cantila SMS — SMS, OTP/2FA and number provisioning fixtures
   ============================================================ */

export const phoneNumbers: PhoneNumber[] = [
  { number: "+1 (415) 555-0142", country: "US", type: "Local", capabilities: ["SMS", "MMS", "Voice"], status: "active", projectId: "pulse-api", sent30d: 9840 },
  { number: "+1 (888) 555-0177", country: "US", type: "Toll-free", capabilities: ["SMS", "Voice"], status: "active", projectId: "aurora-store", sent30d: 3420 },
  { number: "+44 7700 900318", country: "GB", type: "Local", capabilities: ["SMS"], status: "active", projectId: "pulse-api", sent30d: 1190 },
  { number: "+1 (212) 555-0190", country: "US", type: "Local", capabilities: ["SMS", "MMS"], status: "provisioning", sent30d: 0 },
];

export const smsMessages: SmsMessage[] = [
  { id: "sm1", direction: "outbound", to: "+1 (628) 555-0148", from: "+1 (415) 555-0142", body: "Your Pulse code is 884213. It expires in 10 minutes.", status: "delivered", projectId: "pulse-api", at: "3m ago" },
  { id: "sm2", direction: "outbound", to: "+1 (503) 555-0192", from: "+1 (888) 555-0177", body: "aurora-store: your order #A-7741 has shipped. Track it at aurora.sh/t/7741", status: "delivered", projectId: "aurora-store", at: "12m ago" },
  { id: "sm3", direction: "inbound", to: "+1 (888) 555-0177", from: "+1 (503) 555-0192", body: "STOP", status: "received", projectId: "aurora-store", at: "14m ago" },
  { id: "sm4", direction: "outbound", to: "+1 (415) 555-0166", from: "+1 (415) 555-0142", body: "Your Pulse code is 220471. It expires in 10 minutes.", status: "failed", projectId: "pulse-api", at: "28m ago" },
  { id: "sm5", direction: "outbound", to: "+44 7700 900042", from: "+44 7700 900318", body: "Your Pulse code is 551903. It expires in 10 minutes.", status: "delivered", projectId: "pulse-api", at: "44m ago" },
  { id: "sm6", direction: "outbound", to: "+1 (628) 555-0101", from: "+1 (415) 555-0142", body: "Cantila alert: metabase recovered and is serving traffic again.", status: "delivered", projectId: "metabase", at: "1h ago" },
  { id: "sm7", direction: "inbound", to: "+1 (888) 555-0177", from: "+1 (917) 555-0133", body: "HELP", status: "received", projectId: "aurora-store", at: "2h ago" },
  { id: "sm8", direction: "outbound", to: "+1 (212) 555-0188", from: "+1 (888) 555-0177", body: "aurora-store: 20% off everything this weekend only. Reply STOP to opt out.", status: "sent", projectId: "aurora-store", at: "3h ago" },
];

export const verifications: Verification[] = [
  { id: "v1", phone: "+1 ••• ••• 0148", channel: "SMS", status: "verified", projectId: "pulse-api", at: "3m ago" },
  { id: "v2", phone: "+1 ••• ••• 7720", channel: "SMS", status: "pending", projectId: "pulse-api", at: "6m ago" },
  { id: "v3", phone: "+44 ••• ••• 2031", channel: "SMS", status: "verified", projectId: "pulse-api", at: "19m ago" },
  { id: "v4", phone: "+1 ••• ••• 5567", channel: "SMS", status: "expired", projectId: "pulse-api", at: "41m ago" },
  { id: "v5", phone: "+1 ••• ••• 9904", channel: "Voice", status: "verified", projectId: "pulse-api", at: "1h ago" },
  { id: "v6", phone: "+1 ••• ••• 1180", channel: "SMS", status: "failed", projectId: "pulse-api", at: "2h ago" },
];

/* SMS sent / day — last 14 days */
export const smsVolume: number[] = series(402, 14, 440, 260, { min: 60 });

export const smsStats = {
  sent30d: 14450,
  received30d: 612,
  deliveryRate: 98.1,
  verifications30d: 2870,
  verifyRate: 96.4,
};

/* ============================================================
   Cantila Mail — webmail: per-mailbox messages
   ============================================================ */

const emailsByMailbox: Record<string, EmailMessage[]> = {
  "jj@cantila.dev": [
    { id: "jj1", folder: "inbox", fromName: "Hetzner Cloud", fromAddress: "noreply@hetzner.com", to: "jj@cantila.dev", subject: "New server provisioned — node-fsn-03", preview: "Your CX22 instance in Falkenstein is ready.", body: "Your new CX22 instance in Falkenstein (fsn1) has been provisioned and is online.\n\nIt has been added to the Cantila data plane and is accepting workloads.", at: "1h ago", unread: true, starred: false },
    { id: "jj2", folder: "inbox", fromName: "Priya Raman", fromAddress: "priya@cantila.dev", to: "jj@cantila.dev", subject: "Cantila Mail — first-party infra is live", preview: "Inbound MX, outbound MTAs and webmail all on our own boxes…", body: "Quick update — the first-party mail stack is fully up.\n\nInbound MX cluster, outbound MTAs with our own IP pools, DKIM signing and webmail are all running on Cantila hardware. No relay anywhere in the path.\n\nWant to review before we open it to beta users?", at: "3h ago", unread: true, starred: true },
    { id: "jj3", folder: "inbox", fromName: "Stripe", fromAddress: "receipts@stripe.com", to: "jj@cantila.dev", subject: "Your payout of $2,140.55 is on the way", preview: "Expected in your account by May 26.", body: "A payout of $2,140.55 has been initiated to your bank account.\n\nExpected arrival: May 26, 2026.", at: "1d ago", unread: false, starred: false, attachments: ["payout-may-2026.pdf"] },
    { id: "jj4", folder: "inbox", fromName: "Cantila Status", fromAddress: "status@cantila.app", to: "jj@cantila.dev", subject: "Resolved — metabase OOM incident", preview: "AI troubleshooting proposed a memory resize; container healthy.", body: "The metabase project crashed after an out-of-memory kill.\n\nCantila AI troubleshooting identified an under-provisioned container and proposed a resize to 2 GB RAM. After the change the container is healthy again.", at: "1d ago", unread: false, starred: false },
    { id: "jj5", folder: "sent", fromName: "JJ Cantila", fromAddress: "jj@cantila.dev", to: "priya@cantila.dev", subject: "Re: Cantila Mail — first-party infra is live", preview: "Great work. Let's do a review pass tomorrow morning…", body: "Great work — this is exactly the position we want: every byte on our own infrastructure.\n\nLet's do a review pass tomorrow morning, then line up the first beta mailboxes.", at: "2h ago", unread: false, starred: false },
    { id: "jj6", folder: "drafts", fromName: "JJ Cantila", fromAddress: "jj@cantila.dev", to: "team@cantila.dev", subject: "Beta launch checklist", preview: "Draft — things to close before we open the beta…", body: "Draft notes for the beta launch checklist:\n\nConfirm SPF/DKIM/DMARC on all sending domains. Warm up the outbound IP pools. Lock in the number inventory for SMS verification.", at: "5h ago", unread: false, starred: false },
    { id: "jj7", folder: "spam", fromName: "Domain Registry", fromAddress: "billing@domain-renewal-notice.co", to: "jj@cantila.dev", subject: "URGENT: your domain will expire today", preview: "Final notice — pay now to keep your domain…", body: "This is a final notice regarding your domain registration. Pay immediately to avoid loss of service.\n\nCantila Mail flagged this message as spam — it is not from Cantila Domains.", at: "2d ago", unread: false, starred: false },
  ],
  "priya@cantila.dev": [
    { id: "pr1", folder: "inbox", fromName: "JJ Cantila", fromAddress: "jj@cantila.dev", to: "priya@cantila.dev", subject: "Re: Cantila Mail — first-party infra is live", preview: "Great work. Let's do a review pass tomorrow morning…", body: "Great work — this is exactly the position we want: every byte on our own infrastructure.\n\nLet's do a review pass tomorrow morning, then line up the first beta mailboxes.", at: "2h ago", unread: true, starred: false },
    { id: "pr2", folder: "inbox", fromName: "GitHub", fromAddress: "noreply@github.com", to: "priya@cantila.dev", subject: "[cantila/console] CI passed on main", preview: "All checks have passed for commit 8c1d4e2.", body: "All checks have passed for the latest push to main (8c1d4e2).\n\nBuild, lint and type-check completed successfully.", at: "5h ago", unread: false, starred: false },
    { id: "pr3", folder: "sent", fromName: "Priya Raman", fromAddress: "priya@cantila.dev", to: "jj@cantila.dev", subject: "Cantila Mail — first-party infra is live", preview: "Inbound MX, outbound MTAs and webmail all on our own boxes…", body: "Quick update — the first-party mail stack is fully up.\n\nInbound MX cluster, outbound MTAs with our own IP pools, DKIM signing and webmail are all running on Cantila hardware. No relay anywhere in the path.", at: "3h ago", unread: false, starred: false },
  ],
  "marco@cantila.dev": [
    { id: "mc1", folder: "inbox", fromName: "Cantila Status", fromAddress: "status@cantila.app", to: "marco@cantila.dev", subject: "Deploy succeeded — pulse-api", preview: "3d5c9e0 deployed to ash in 52s.", body: "pulse-api was deployed successfully.\n\nCommit 3d5c9e0 · region ash · build time 52s.", at: "5h ago", unread: true, starred: false },
    { id: "mc2", folder: "inbox", fromName: "Dani Okonkwo", fromAddress: "dani@cantila.dev", to: "marco@cantila.dev", subject: "SMS conversations view", preview: "Pushed the thread UI — can you take a look?", body: "I pushed the SMS conversations view — two-pane threads with a composer.\n\nCan you review when you get a chance?", at: "1d ago", unread: false, starred: false },
    { id: "mc3", folder: "sent", fromName: "Marco Léon", fromAddress: "marco@cantila.dev", to: "dani@cantila.dev", subject: "Re: SMS conversations view", preview: "Looks great — shipping it.", body: "Looks great — clean and fast. Shipping it.", at: "20h ago", unread: false, starred: false },
  ],
  "dani@cantila.dev": [
    { id: "dn1", folder: "inbox", fromName: "Marco Léon", fromAddress: "marco@cantila.dev", to: "dani@cantila.dev", subject: "Re: SMS conversations view", preview: "Looks great — shipping it.", body: "Looks great — clean and fast. Shipping it.", at: "20h ago", unread: true, starred: false },
    { id: "dn2", folder: "inbox", fromName: "Cantila", fromAddress: "team@cantila.app", to: "dani@cantila.dev", subject: "Welcome to the team", preview: "Your @cantila.dev mailbox is ready.", body: "Welcome aboard!\n\nYour @cantila.dev mailbox is live on Cantila Mail. Webmail is right here, and IMAP/POP3 access works with any desktop client.", at: "1d ago", unread: false, starred: false },
    { id: "dn3", folder: "archive", fromName: "Cantila Status", fromAddress: "status@cantila.app", to: "dani@cantila.dev", subject: "Weekly digest", preview: "No incidents in the last 7 days.", body: "Weekly status digest — no incidents across the fleet in the last 7 days.", at: "4d ago", unread: false, starred: false },
  ],
  "hello@cantila.dev": [
    { id: "hl1", folder: "inbox", fromName: "Marcus Webb", fromAddress: "marcus@brightfox.io", to: "hello@cantila.dev", subject: "Can't connect my custom domain", preview: "I added brightfox.io but SSL is still pending after an hour…", body: "Hi — I added brightfox.io to my project but the SSL certificate has been issuing for about an hour.\n\nIs there something I need to do on my end? The DNS is managed by Cantila.", at: "25m ago", unread: true, starred: false },
    { id: "hl2", folder: "inbox", fromName: "Ben Adler", fromAddress: "ben@foundry.studio", to: "hello@cantila.dev", subject: "Re: partnership enquiry", preview: "We host ~40 client sites and are looking at your reseller plan…", body: "Thanks for the quick reply.\n\nWe're an agency hosting around 40 client sites and we're very interested in the white-label reseller plan. Could we set up a call next week?", at: "1h ago", unread: true, starred: true },
    { id: "hl3", folder: "inbox", fromName: "Aisha Khan", fromAddress: "aisha@khandesign.co", to: "hello@cantila.dev", subject: "Billing question — metered usage", preview: "I went slightly over my bandwidth allowance — how is that charged?", body: "Quick question — I went a little over my bandwidth allowance this month.\n\nHow is the overage charged, and can I set a spend cap so it doesn't happen again?", at: "4h ago", unread: false, starred: false },
    { id: "hl4", folder: "inbox", fromName: "Tom Reyes", fromAddress: "tom@reyes.dev", to: "hello@cantila.dev", subject: "Feature request: deploy from GitLab", preview: "Love Chat Deploy — any plans for GitLab support?", body: "Really enjoying Chat Deploy and the MCP server.\n\nAny plans to support GitLab repositories alongside GitHub? That's the one thing keeping me from moving everything over.", at: "1d ago", unread: false, starred: false },
    { id: "hl5", folder: "sent", fromName: "Cantila Support", fromAddress: "hello@cantila.dev", to: "marcus@brightfox.io", subject: "Re: Can't connect my custom domain", preview: "Thanks for flagging — we re-triggered SSL issuance…", body: "Thanks for flagging this.\n\nWe've re-triggered SSL issuance for brightfox.io — it should go active within a few minutes. Let us know if it doesn't.", at: "20m ago", unread: false, starred: false },
    { id: "hl6", folder: "archive", fromName: "Lena Fischer", fromAddress: "lena@fischer.works", to: "hello@cantila.dev", subject: "Re: ticket #2208 — resolved", preview: "Thanks, the database connection works now!", body: "That did it — the database connects fine now over the private network.\n\nThanks for the fast help!", at: "3d ago", unread: false, starred: false },
  ],
  "orders@aurorastore.shop": [
    { id: "or1", folder: "inbox", fromName: "Kara Lin", fromAddress: "kara.lin@gmail.com", to: "orders@aurorastore.shop", subject: "Where is my order #A-7741?", preview: "It's been a few days — any tracking update?", body: "Hi — I ordered the Aurora Tote (order #A-7741) a few days ago.\n\nCould you share a tracking update? Thanks!", at: "18m ago", unread: true, starred: false },
    { id: "or2", folder: "inbox", fromName: "Mail Delivery System", fromAddress: "mailer-daemon@aurorastore.shop", to: "orders@aurorastore.shop", subject: "Undelivered: Your order has shipped", preview: "Delivery to t.morrow@outlok.com failed permanently.", body: "Your message could not be delivered.\n\nRecipient: t.morrow@outlok.com\nReason: domain not found — the address may be misspelled.\n\nCantila Mail did not retry, as the recipient domain does not exist.", at: "41m ago", unread: false, starred: false },
    { id: "or3", folder: "inbox", fromName: "Jordan Pace", fromAddress: "jordanp@fastmail.com", to: "orders@aurorastore.shop", subject: "Wrong size received", preview: "I ordered a medium but got a small — how do I exchange?", body: "I received order #A-7702 but it's a small — I ordered a medium.\n\nWhat's the process for an exchange?", at: "6h ago", unread: false, starred: false },
    { id: "or4", folder: "sent", fromName: "aurora-store", fromAddress: "orders@aurorastore.shop", to: "kara.lin@gmail.com", subject: "Your aurora-store order #A-7741", preview: "Thanks for your order! Here's your receipt.", body: "Thanks for shopping with aurora-store.\n\nOrder #A-7741 — Aurora Tote ×1 — $48.00\n\nYou'll get a shipping notification as soon as it's on the way.", at: "2m ago", unread: false, starred: false },
    { id: "or5", folder: "spam", fromName: "SEO Boost Pro", fromAddress: "deals@seo-boost-pro.biz", to: "orders@aurorastore.shop", subject: "Rank #1 on Google — guaranteed", preview: "Get 10,000 backlinks this week…", body: "Boost your store to the top of Google with our backlink package.\n\nCantila Mail flagged this message as spam.", at: "2d ago", unread: false, starred: false },
  ],
};

export function getEmails(address: string): EmailMessage[] {
  return emailsByMailbox[address] ?? [];
}

export function mailboxSlug(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getMailboxBySlug(slug: string): Mailbox | undefined {
  return mailboxes.find((m) => mailboxSlug(m.address) === slug);
}

/* ============================================================
   Cantila SMS — conversation threads, per number
   ============================================================ */

const conversationsByNumber: Record<string, SmsConversation[]> = {
  "+1 (415) 555-0142": [
    {
      id: "cv-415-2",
      number: "+1 (415) 555-0142",
      contact: "+1 (628) 555-0101",
      contactLabel: "Pulse — support reply",
      unread: 1,
      messages: [
        { id: "m1", direction: "inbound", body: "Hi, I never received my verification code.", at: "32m ago" },
        { id: "m2", direction: "outbound", body: "Sorry about that — we've re-sent it just now. It can take up to a minute to arrive.", at: "31m ago", status: "delivered" },
        { id: "m3", direction: "inbound", body: "Got it now, thanks!", at: "29m ago" },
        { id: "m4", direction: "outbound", body: "Great — glad it came through. Anything else we can help with?", at: "28m ago", status: "delivered" },
      ],
    },
    {
      id: "cv-415-1",
      number: "+1 (415) 555-0142",
      contact: "+1 (628) 555-0148",
      contactLabel: "Devon R.",
      unread: 0,
      messages: [
        { id: "m1", direction: "outbound", body: "Your Pulse code is 884213. It expires in 10 minutes.", at: "3m ago", status: "delivered" },
      ],
    },
    {
      id: "cv-415-3",
      number: "+1 (415) 555-0142",
      contact: "+1 (415) 555-0166",
      contactLabel: "Unknown number",
      unread: 0,
      messages: [
        { id: "m1", direction: "outbound", body: "Your Pulse code is 220471. It expires in 10 minutes.", at: "28m ago", status: "failed" },
      ],
    },
  ],
  "+1 (888) 555-0177": [
    {
      id: "cv-888-2",
      number: "+1 (888) 555-0177",
      contact: "+1 (917) 555-0133",
      contactLabel: "Customer enquiry",
      unread: 1,
      messages: [
        { id: "m1", direction: "inbound", body: "Do you ship to Canada?", at: "2h ago" },
        { id: "m2", direction: "outbound", body: "We do! Standard shipping to Canada is 5–7 business days.", at: "2h ago", status: "delivered" },
        { id: "m3", direction: "inbound", body: "HELP", at: "1h ago" },
        { id: "m4", direction: "outbound", body: "Reply with your order number and we'll take a look right away.", at: "1h ago", status: "delivered" },
      ],
    },
    {
      id: "cv-888-1",
      number: "+1 (888) 555-0177",
      contact: "+1 (503) 555-0192",
      contactLabel: "Order #A-7741",
      unread: 0,
      messages: [
        { id: "m1", direction: "outbound", body: "aurora-store: your order #A-7741 has shipped. Track it at aurora.sh/t/7741", at: "22m ago", status: "delivered" },
        { id: "m2", direction: "inbound", body: "STOP", at: "15m ago" },
        { id: "m3", direction: "outbound", body: "You've been unsubscribed from aurora-store messages. Reply START to opt back in.", at: "14m ago", status: "delivered" },
      ],
    },
    {
      id: "cv-888-3",
      number: "+1 (888) 555-0177",
      contact: "+1 (212) 555-0188",
      contactLabel: "Weekend sale broadcast",
      unread: 0,
      messages: [
        { id: "m1", direction: "outbound", body: "aurora-store: 20% off everything this weekend only. Reply STOP to opt out.", at: "3h ago", status: "sent" },
      ],
    },
  ],
  "+44 7700 900318": [
    {
      id: "cv-44-2",
      number: "+44 7700 900318",
      contact: "+44 7700 902031",
      contactLabel: "Pulse user — GB",
      unread: 0,
      messages: [
        { id: "m1", direction: "outbound", body: "Your Pulse code is 730912. It expires in 10 minutes.", at: "1h ago", status: "delivered" },
        { id: "m2", direction: "inbound", body: "thanks", at: "1h ago" },
      ],
    },
    {
      id: "cv-44-1",
      number: "+44 7700 900318",
      contact: "+44 7700 900042",
      contactLabel: "Pulse user — GB",
      unread: 0,
      messages: [
        { id: "m1", direction: "outbound", body: "Your Pulse code is 551903. It expires in 10 minutes.", at: "44m ago", status: "delivered" },
      ],
    },
  ],
};

export function getConversations(number: string): SmsConversation[] {
  return conversationsByNumber[number] ?? [];
}

export function numberSlug(number: string): string {
  return number.replace(/[^0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getNumberBySlug(slug: string): PhoneNumber | undefined {
  return phoneNumbers.find((n) => numberSlug(n.number) === slug);
}

/* ============================================================
   Cantila Monitoring — observability fixtures
   ============================================================ */

/* deterministic check history — mostly "up", with an optional recent tail */
function checkHistory(seed: number, tail: CheckStatus[] = []): CheckStatus[] {
  const r = rng(seed);
  const head: CheckStatus[] = Array.from({ length: 44 - tail.length }, () =>
    r() > 0.97 ? "degraded" : "up",
  );
  return [...head, ...tail];
}

export const uptimeMonitors: UptimeMonitor[] = [
  { id: "mon-aurora", name: "aurora-store", url: "aurorastore.shop", projectId: "aurora-store", status: "up", uptimePct: 99.98, responseMs: 88, region: "fsn1", history: checkHistory(801) },
  { id: "mon-pulse", name: "pulse-api", url: "api.pulsemetrics.io", projectId: "pulse-api", status: "up", uptimePct: 99.99, responseMs: 62, region: "ash", history: checkHistory(802) },
  { id: "mon-n8n", name: "n8n-ops", url: "n8n-ops.cantila.app", projectId: "n8n-ops", status: "up", uptimePct: 100, responseMs: 140, region: "hel1", history: checkHistory(803) },
  { id: "mon-librechat", name: "librechat", url: "chat.cantila.app", projectId: "librechat", status: "degraded", uptimePct: 99.94, responseMs: 212, region: "fsn1", history: checkHistory(804, ["up", "degraded", "degraded", "up", "degraded"]) },
  { id: "mon-ghost", name: "ghost-journal", url: "journal.cantila.app", projectId: "ghost-journal", status: "up", uptimePct: 99.7, responseMs: 96, region: "hel1", history: checkHistory(805) },
  { id: "mon-metabase", name: "metabase", url: "metrics.cantila.app", projectId: "metabase", status: "down", uptimePct: 97.1, responseMs: 0, region: "fsn1", history: checkHistory(806, ["degraded", "down", "down", "down", "down", "down"]) },
];

export const alerts: Alert[] = [
  { id: "al1", title: "metabase — out of memory", severity: "critical", state: "firing", condition: "Memory usage > 90% for 5m", projectId: "metabase", channels: ["Email", "SMS", "Slack"], at: "40m ago" },
  { id: "al2", title: "librechat — elevated p95 latency", severity: "warning", state: "firing", condition: "p95 latency > 400ms for 10m", projectId: "librechat", channels: ["Email", "Slack"], at: "1h ago" },
  { id: "al3", title: "aurora-store — bandwidth at 80% of plan", severity: "warning", state: "acknowledged", condition: "Plan bandwidth usage > 80%", projectId: "aurora-store", channels: ["Email"], at: "3h ago" },
  { id: "al4", title: "node-ash-01 — CPU spike", severity: "warning", state: "resolved", condition: "Node CPU > 85% for 5m", channels: ["Email", "Webhook"], at: "1d ago" },
  { id: "al5", title: "pulse-api — error rate normalised", severity: "info", state: "resolved", condition: "Error rate back under 0.5%", projectId: "pulse-api", channels: ["Slack"], at: "1d ago" },
];

export const incidents: Incident[] = [
  {
    id: "inc1",
    title: "metabase unavailable after OOM kill",
    severity: "critical",
    state: "monitoring",
    projectId: "metabase",
    startedAt: "40m ago",
    duration: "38m",
    summary:
      "The metabase container was OOM-killed after exceeding its 1 GB memory limit. Cantila AI troubleshooting identified the cause and proposed a resize to 2 GB RAM.",
    updates: [
      { at: "40m ago", state: "investigating", note: "Automated uptime check detected metabase returning 502. A container restart loop was observed." },
      { at: "34m ago", state: "identified", note: "Root cause confirmed — container OOM-killed, memory limit 1024Mi exceeded." },
      { at: "6m ago", state: "monitoring", note: "Memory resized to 2 GB and the project redeployed. Watching for stability before closing." },
    ],
  },
  {
    id: "inc2",
    title: "Elevated latency on node-fsn-01",
    severity: "warning",
    state: "resolved",
    startedAt: "2d ago",
    duration: "22m",
    summary:
      "A noisy workload on node-fsn-01 caused brief latency increases for co-located projects. Workloads were rebalanced across the fsn1 fleet.",
    updates: [
      { at: "2d ago", state: "investigating", note: "p95 latency rising across several fsn1 projects." },
      { at: "2d ago", state: "monitoring", note: "Noisy workload throttled; latency trending down." },
      { at: "2d ago", state: "resolved", note: "Workloads rebalanced off node-fsn-01. Latency back to baseline." },
    ],
  },
  {
    id: "inc3",
    title: "Deploy pipeline queue backlog",
    severity: "warning",
    state: "resolved",
    startedAt: "5d ago",
    duration: "14m",
    summary:
      "A burst of deploys queued behind one slow build. A second builder was added to drain the queue.",
    updates: [
      { at: "5d ago", state: "investigating", note: "Build queue depth rising; deploys delayed." },
      { at: "5d ago", state: "resolved", note: "Added a second builder — the queue drained and deploys resumed." },
    ],
  },
];

export const statusComponents: StatusComponent[] = [
  { name: "Cantila Console", status: "up" },
  { name: "Deploy pipeline", status: "up" },
  { name: "Chat Deploy & MCP server", status: "up" },
  { name: "Cantila Mail", status: "up" },
  { name: "Cantila SMS", status: "up" },
  { name: "Data plane — fsn1", status: "degraded" },
  { name: "Data plane — hel1", status: "up" },
  { name: "Data plane — ash", status: "up" },
];

/* ============================================================
   Cantila Data — S3-compatible object storage buckets
   ============================================================ */

export const storageBuckets: StorageBucket[] = [
  { id: "buk-aurora", name: "aurora-assets", region: "fsn1", visibility: "public", objects: 12480, sizeGb: 8.2, cdn: true, linkedProjectId: "aurora-store", createdAt: "Mar 2026" },
  { id: "buk-invoice", name: "invoice-agent-store", region: "fsn1", visibility: "private", objects: 3140, sizeGb: 4.6, cdn: false, linkedProjectId: "invoice-agent", createdAt: "May 2026" },
  { id: "buk-pulse", name: "pulse-uploads", region: "ash", visibility: "private", objects: 28910, sizeGb: 19.4, cdn: true, linkedProjectId: "pulse-api", createdAt: "Jan 2026" },
  { id: "buk-backups", name: "cantila-backups", region: "hel1", visibility: "private", objects: 642, sizeGb: 54.8, cdn: false, createdAt: "Dec 2025" },
];

/* ============================================================
   Cantila Automations — sample n8n + OpenClaw instances (plan §4.10)
   ============================================================ */

import type { Automation, Connection, WorkflowSummary } from "./types";

export const automations: Automation[] = [
  {
    id: "aut_n8n_ops",
    kind: "n8n",
    name: "ops-flows",
    slug: "ops-flows",
    status: "live",
    region: "fsn1",
    alwaysOn: true,
    createdAt: "Apr 2026",
    adminUrl: "https://ops-flows.cantila.app",
  },
  {
    id: "aut_n8n_lead",
    kind: "n8n",
    name: "lead-scoring",
    slug: "lead-scoring",
    status: "live",
    region: "fsn1",
    alwaysOn: true,
    createdAt: "May 2026",
    adminUrl: "https://lead-scoring.cantila.app",
  },
  {
    id: "aut_opc_research",
    kind: "openclaw",
    name: "research-claw",
    slug: "research-claw",
    status: "live",
    region: "fsn1",
    alwaysOn: false,
    createdAt: "May 2026",
    adminUrl: "https://research-claw.cantila.app",
  },
  {
    id: "aut_opc_inbox",
    kind: "openclaw",
    name: "inbox-triage",
    slug: "inbox-triage",
    status: "sleeping",
    region: "hel1",
    alwaysOn: false,
    createdAt: "Apr 2026",
    adminUrl: "https://inbox-triage.cantila.app",
  },
];

export const workflowsByAutomation: Record<string, WorkflowSummary[]> = {
  aut_n8n_ops: [
    { id: "wf_paid_invoice", name: "On paid invoice → Slack", active: true, lastRunAt: "12m ago", lastRunStatus: "success" },
    { id: "wf_signup_welcome", name: "New signup → welcome email", active: true, lastRunAt: "1h ago", lastRunStatus: "success" },
    { id: "wf_pagerduty_sync", name: "PagerDuty → status page", active: false },
  ],
  aut_n8n_lead: [
    { id: "wf_score", name: "Score new lead w/ OpenAI", active: true, lastRunAt: "2m ago", lastRunStatus: "success" },
    { id: "wf_handoff", name: "Hand off hot leads to AE", active: true, lastRunAt: "23m ago", lastRunStatus: "failed" },
  ],
  aut_opc_research: [
    { id: "wf_competitor", name: "Competitor watch (weekly)", active: true, lastRunAt: "3d ago", lastRunStatus: "success" },
  ],
  aut_opc_inbox: [
    { id: "wf_triage", name: "Inbox triage", active: false, lastRunAt: "8d ago", lastRunStatus: "success" },
  ],
};

/* ============================================================
   Cantila Connections — sample account-wide integrations (plan §4.11)
   ============================================================ */

export const connections: Connection[] = [
  {
    id: "conn_openai_jj",
    provider: "openai",
    name: "JJ — OpenAI",
    authKind: "api_key",
    status: "active",
    metadata: {},
    createdAt: "Apr 2026",
    lastUsedAt: "2m ago",
  },
  {
    id: "conn_anthropic_team",
    provider: "anthropic",
    name: "Cantila team — Anthropic",
    authKind: "api_key",
    status: "active",
    metadata: {},
    createdAt: "Apr 2026",
    lastUsedAt: "11m ago",
  },
  {
    id: "conn_stripe_live",
    provider: "stripe",
    name: "Cantila — Stripe live",
    authKind: "api_key",
    status: "active",
    metadata: {},
    createdAt: "Mar 2026",
    lastUsedAt: "47m ago",
  },
];
