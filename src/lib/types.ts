/* ============================================================
   Cantila Console — domain types
   Shared shapes for the prototype's mock data layer. In a real
   build these would be generated from the Cantila API schema.
   ============================================================ */

export type ProjectStatus = "live" | "building" | "sleeping" | "crashed" | "paused";

export type DeployStatus = "live" | "building" | "queued" | "failed" | "rolled-back" | "superseded";

export type DeployTrigger = "chat" | "git" | "cli" | "mcp" | "upload";

export type Runtime =
  | "Next.js"
  | "Node.js"
  | "Python"
  | "PHP"
  | "Static"
  | "Docker"
  | "Go";

export type Region = "fsn1" | "hel1" | "ash";

export type LogLevel = "info" | "warn" | "error" | "debug" | "build";

export type DbEngine = "postgres" | "mysql" | "mongodb" | "redis";

export interface Project {
  id: string; // slug, used for routing
  name: string;
  runtime: Runtime;
  region: Region;
  status: ProjectStatus;
  url: string;
  repo?: string;
  description: string;
  lastDeployAt: string; // human relative
  createdAt: string;
  vcpu: number;
  memoryMb: number;
  diskGb: number;
  autoSleep: boolean;
  alwaysOn: boolean;
  type: "Web app" | "Static site" | "API" | "AI agent" | "Worker" | "Cron";
  databaseId?: string;
  metrics: ProjectMetrics;
}

export interface ProjectMetrics {
  cpu: number[]; // percent, 24 hourly points
  memory: number[]; // percent
  requests: number[]; // per hour
  latency: number[]; // ms p95
  uptimePct: number;
  reqPerMin: number;
}

export interface Deployment {
  id: string;
  projectId: string;
  status: DeployStatus;
  trigger: DeployTrigger;
  branch: string;
  commitHash: string;
  commitMessage: string;
  author: string;
  durationSec: number;
  createdAt: string; // human relative
}

export interface LogLine {
  ts: string; // HH:MM:SS.mmm
  level: LogLevel;
  source: string;
  message: string;
}

export interface EnvVar {
  key: string;
  preview: string;
  scope: "production" | "preview" | "all";
  updatedAt: string;
  secret: boolean;
}

export interface Domain {
  name: string;
  kind: "subdomain" | "custom";
  projectId: string;
  ssl: "active" | "issuing" | "none";
  dns: "wired" | "pending" | "external";
  primary: boolean;
}

export interface Database {
  id: string;
  name: string;
  engine: DbEngine;
  version: string;
  status: "healthy" | "provisioning" | "sleeping";
  region: Region;
  sizeGb: number;
  usedGb: number;
  plan: string;
  linkedProjectId?: string;
  backupsAt: string;
}

export interface Template {
  id: string;
  name: string;
  category: "AI agents" | "CMS & sites" | "Databases" | "Dev tools" | "Analytics";
  blurb: string;
  glyph: string; // single-char mark
  deploys: string; // formatted count
  tags: string[];
  featured?: boolean;
}

export interface TeamMember {
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Developer" | "Viewer";
  initials: string;
  lastActive: string;
  you?: boolean;
}

export interface Activity {
  id: string;
  kind:
    | "deploy"
    | "domain"
    | "database"
    | "billing"
    | "alert"
    | "member"
    | "mail"
    | "sms";
  title: string;
  detail: string;
  at: string;
  project?: string;
  /** Plan §5.5 — white-label audit. Set when an agency parent drove
   *  this event against a sub-account (actor ≠ target). */
  actorAccountId?: string;
}

export interface UsageMetric {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

/* ============================================================
   Cantila Mail — full send-and-receive email provider (§4.4)
   ============================================================ */

/** state of a DNS authentication record */
export type MailAuthState = "ok" | "pending" | "missing";

export interface MailDomain {
  domain: string;
  spf: MailAuthState;
  dkim: MailAuthState;
  dmarc: MailAuthState;
  mx: MailAuthState;
  reputation: number; // 0..100 sender score
  sent30d: number;
  purpose: string; // human label — what this domain sends/receives
}

export interface Mailbox {
  address: string;
  displayName: string;
  domain: string;
  kind: "personal" | "shared";
  usedMb: number;
  quotaMb: number;
  status: "active" | "provisioning";
  member?: string; // linked team member, if a personal mailbox
}

export interface MailAlias {
  address: string;
  target: string; // forwards-to address, or "<project> webhook" for parse
  kind: "alias" | "forward" | "catch-all" | "parse";
  projectId?: string;
}

export type MailEventStatus =
  | "delivered"
  | "queued"
  | "bounced"
  | "complaint"
  | "received";

export interface MailEvent {
  id: string;
  direction: "outbound" | "inbound";
  subject: string;
  party: string; // recipient (outbound) or sender (inbound)
  status: MailEventStatus;
  projectId?: string;
  at: string;
}

/* ============================================================
   Cantila SMS — unified SMS, OTP/2FA and number provisioning (§4.5)
   ============================================================ */

export type SmsCapability = "SMS" | "MMS" | "Voice";

export interface PhoneNumber {
  number: string;
  country: string; // ISO-ish label, e.g. "US", "GB"
  type: "Local" | "Toll-free" | "Short code";
  capabilities: SmsCapability[];
  status: "active" | "provisioning";
  projectId?: string;
  sent30d: number;
}

export type SmsStatus = "delivered" | "sent" | "failed" | "received";

export interface SmsMessage {
  id: string;
  direction: "outbound" | "inbound";
  to: string;
  from: string;
  body: string;
  status: SmsStatus;
  projectId?: string;
  at: string;
}

export type VerificationStatus = "verified" | "pending" | "expired" | "failed";

export interface Verification {
  id: string;
  phone: string; // masked
  channel: "SMS" | "Voice";
  status: VerificationStatus;
  projectId?: string;
  at: string;
}

/* ---------- Cantila Mail — webmail client ---------- */

export type MailFolder = "inbox" | "sent" | "drafts" | "archive" | "spam";

export interface EmailMessage {
  id: string;
  folder: MailFolder;
  fromName: string;
  fromAddress: string;
  to: string;
  subject: string;
  preview: string; // one-line snippet
  body: string; // full plain-text body, \n between paragraphs
  at: string; // relative time
  unread: boolean;
  starred: boolean;
  attachments?: string[]; // file names
}

/* ---------- Cantila SMS — conversation threads ---------- */

export interface SmsThreadMessage {
  id: string;
  direction: "outbound" | "inbound";
  body: string;
  at: string;
  status?: SmsStatus; // outbound only
}

export interface SmsConversation {
  id: string;
  number: string; // the Cantila number that owns the thread
  contact: string; // the external party's number
  contactLabel: string; // friendly label for the contact
  unread: number;
  messages: SmsThreadMessage[];
}

/* ============================================================
   Cantila Monitoring — observability (§5.3)
   ============================================================ */

export type CheckStatus = "up" | "degraded" | "down";

export interface UptimeMonitor {
  id: string;
  name: string;
  url: string;
  projectId?: string;
  status: CheckStatus;
  uptimePct: number; // 30-day uptime
  responseMs: number;
  region: Region;
  history: CheckStatus[]; // recent checks, oldest → newest
}

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertState = "firing" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  state: AlertState;
  condition: string; // the rule that triggers it
  projectId?: string;
  channels: string[]; // delivery channels — Email, SMS, Slack, Webhook
  at: string;
}

export type IncidentState =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

export interface IncidentUpdate {
  at: string;
  state: IncidentState;
  note: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: AlertSeverity;
  state: IncidentState;
  projectId?: string;
  startedAt: string;
  duration: string;
  summary: string;
  updates: IncidentUpdate[];
}

export interface StatusComponent {
  name: string;
  status: CheckStatus;
}

/* ---------- Cantila Data — object storage ---------- */

export interface StorageBucket {
  id: string;
  name: string;
  region: Region;
  visibility: "private" | "public";
  objects: number; // object count
  sizeGb: number; // size used
  cdn: boolean; // Cantila CDN enabled
  linkedProjectId?: string;
  createdAt: string;
}

/* ---------- Cantila Automations (plan §4.10) ---------- */

export type AutomationKind = "n8n" | "openclaw";

/** An automation instance — backed by a control-plane Project with
 *  `automationKind` set. The console treats these as a separate resource
 *  list ("Automations") so they don't clutter the regular Projects view. */
export interface Automation {
  id: string;
  kind: AutomationKind;
  name: string;
  slug: string;
  status: ProjectStatus;
  region: Region;
  alwaysOn: boolean;
  createdAt: string;
  adminUrl: string;
}

/** A connector users drag onto the workflow canvas. Loaded from the
 *  control plane's `/v1/automations/:id/node-types` and rendered by
 *  the palette + parameter form components. */
export interface NodeTypeDescriptor {
  id: string;
  kind: AutomationKind;
  name: string;
  category: string;
  blurb: string;
  glyph: string;
  parameters: Record<string, unknown>;
  requiresConnection: boolean;
  connectionProviders?: string[];
}

/** Console-side canonical workflow shape — mirrors the engine port's
 *  `WorkflowGraph`. Round-tripped opaque through the engine adapter. */
export interface WorkflowGraph {
  id: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  triggers: GraphTrigger[];
  meta?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  parameters: Record<string, unknown>;
  connectionId?: string;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort?: string;
}

export type TriggerKind = "manual" | "webhook" | "schedule";

export interface GraphTrigger {
  id: string;
  kind: TriggerKind;
  config?: Record<string, unknown>;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  lastRunAt?: string;
  lastRunStatus?: "success" | "failed" | "running";
}

/* ---------- Cantila Connections (plan §4.11) ---------- */

export type ConnectionAuthKind = "oauth" | "api_key" | "basic";
export type ConnectionStatus = "active" | "expired" | "broken";

export interface Connection {
  id: string;
  provider: string;
  name: string;
  authKind: ConnectionAuthKind;
  status: ConnectionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface ProviderApiKeyField {
  key: string;
  label: string;
  secret: boolean;
  hint?: string;
}

export interface ProviderDescriptor {
  id: string;
  name: string;
  blurb: string;
  glyph: string;
  iconUrl?: string;
  authKinds: ConnectionAuthKind[];
  oauth?: { scopes: string[]; requiresRedirect: true };
  apiKey?: {
    fields: ProviderApiKeyField[];
    testUrl?: string;
  };
}
