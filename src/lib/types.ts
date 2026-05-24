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
  kind: "deploy" | "domain" | "database" | "billing" | "alert" | "member";
  title: string;
  detail: string;
  at: string;
  project?: string;
}

export interface UsageMetric {
  label: string;
  used: number;
  limit: number;
  unit: string;
}
