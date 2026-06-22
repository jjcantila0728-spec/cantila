/* ============================================================
   Cantila Console — typed client for the Control Plane API.
   The Console talks to the control plane through a Next.js proxy
   route (src/app/api/cantila/[...path]/route.ts) so cookies and any
   future auth handling stay server-side.

   The shapes here mirror the control plane's domain types — keep
   them in sync with cantila-control-plane/src/domain/types.ts.
   ============================================================ */

export type ApiRuntime =
  | "static"
  | "node"
  | "python"
  | "php"
  | "go"
  | "ruby"
  | "docker";

export type ApiRegion = "fsn1" | "hel1" | "ash";

export type ApiProjectStatus =
  | "provisioning"
  | "building"
  | "live"
  | "sleeping"
  | "crashed"
  | "paused";

export type ApiDeployTrigger = "chat" | "git" | "cli" | "mcp" | "upload";

export type ApiDeployStatus =
  | "queued"
  | "building"
  | "live"
  | "failed"
  | "rolled_back"
  | "superseded";

export interface ApiProject {
  id: string;
  accountId: string;
  slug: string;
  name: string;
  runtime: ApiRuntime;
  region: ApiRegion;
  status: ApiProjectStatus;
  vcpu: number;
  memoryMb: number;
  diskGb: number;
  alwaysOn: boolean;
  autoSleep: boolean;
  desiredInstances: number;
  minInstances: number;
  maxInstances: number;
  repoUrl?: string;
  branch?: string;
  autoDeploy: boolean;
  automationKind?: "n8n" | "openclaw";
  createdAt: string;
}

export interface ApiInstance {
  id: string;
  projectId: string;
  index: number;
  nodeId: string;
  region: ApiRegion;
  status: "starting" | "healthy" | "draining" | "crashed";
  startedAt: string;
}

export interface ApiManagedDatabase {
  id: string;
  projectId: string;
  engine: "postgres" | "mysql" | "mongodb" | "redis";
  version: string;
  region: ApiRegion;
  status: "provisioning" | "active" | "sleeping" | "error";
  connectionUri: string; // masked
  createdAt: string;
}

export interface ApiMailbox {
  id: string;
  projectId: string;
  address: string;
  sendingDomain: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string; // masked
  status: "provisioning" | "active" | "sleeping" | "error";
  createdAt: string;
}

export interface ApiPhoneNumber {
  id: string;
  projectId: string;
  e164: string;
  region: ApiRegion;
  status: "provisioning" | "active" | "sleeping" | "error";
  apiKey: string; // masked
  createdAt: string;
}

export interface ApiDomain {
  id: string;
  projectId: string;
  hostname: string;
  kind: "subdomain" | "custom";
  sslActive: boolean;
  primary: boolean;
  createdAt: string;
}

export interface ApiDeployment {
  id: string;
  projectId: string;
  status: ApiDeployStatus;
  trigger: ApiDeployTrigger;
  runtime: ApiRuntime;
  imageRef?: string;
  nodeId?: string;
  url?: string;
  logs: string[];
  commitHash?: string;
  commitMessage?: string;
  branch?: string;
  /** Set when this deployment is a branch preview (plan §5.1). */
  previewBranch?: string;
  createdAt: string;
}

export interface ApiProjectDetail {
  project: ApiProject;
  services: {
    database: ApiManagedDatabase | null;
    mailbox: ApiMailbox | null;
    phoneNumber: ApiPhoneNumber | null;
  };
  deployments: ApiDeployment[];
  domains: ApiDomain[];
}

export interface ApiEnvVar {
  key: string;
  value: string;
  secret: boolean;
  scope: "production" | "preview" | "all";
}

export interface ApiDeployOutcome {
  deploymentId: string;
  status: "live" | "failed";
  url: string;
  steps: string[];
  provisioned: {
    databaseCreated: boolean;
    mailboxCreated: boolean;
    injectedEnv: string[];
  };
}

/* ---------- mobile builds + store releases (plan: mobile apps) ---------- */

export interface ApiMobileBuild {
  id: string;
  projectId: string;
  platform: "android" | "ios";
  mobileStack: string;
  status: "queued" | "building" | "succeeded" | "failed";
  artifactKind: "aab" | "apk";
  artifactPath?: string;
  artifactSize?: number;
  applicationId: string;
  versionCode: number;
  versionName: string;
  log?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface ApiStoreRelease {
  id: string;
  projectId: string;
  buildId: string;
  store: "google_play" | "app_store";
  track: "internal" | "alpha" | "beta" | "production";
  status: "submitted" | "published" | "stubbed" | "failed";
  externalRef?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- fetch helper ---------- */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Where the Console reaches the control plane. The browser always goes
 *  through `/api/cantila/*`, which the Next.js proxy forwards. */
const API_BASE = "/api/cantila/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Fastify rejects write methods with application/json + empty body, so
  // fill in `{}` when no body was supplied.
  const writeMethods = new Set(["POST", "PUT", "PATCH"]);
  const method = (init?.method ?? "GET").toUpperCase();
  const finalBody =
    init?.body !== undefined
      ? init.body
      : writeMethods.has(method)
        ? "{}"
        : undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
    body: finalBody,
    cache: "no-store",
  });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `request failed: ${res.status}`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ---------- typed methods ---------- */

export const api = {
  health: () =>
    request<{ status: string; service: string; time: string }>("/health"),

  listProjects: (accountId?: string) =>
    request<{ projects: ApiProject[] }>(
      accountId
        ? `/projects?accountId=${encodeURIComponent(accountId)}`
        : `/projects`,
    ),

  createProject: (input: {
    name: string;
    runtime?: ApiRuntime;
    region?: ApiRegion;
    accountId?: string;
  }) =>
    request<ApiProject>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getProject: (projectId: string) =>
    request<ApiProjectDetail>(`/projects/${encodeURIComponent(projectId)}`),

  deleteProject: (projectId: string) =>
    request<{ ok: true; slug: string }>(
      `/projects/${encodeURIComponent(projectId)}`,
      { method: "DELETE" },
    ),

  deploy: (
    projectId: string,
    input: { trigger?: ApiDeployTrigger; source?: { kind: "git" | "upload" | "chat"; ref?: string } } = {},
  ) =>
    request<ApiDeployOutcome>(`/projects/${encodeURIComponent(projectId)}/deploy`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getLogs: (projectId: string) =>
    request<{ deployments: { deploymentId: string; status: string; logs: string[] }[] }>(
      `/projects/${encodeURIComponent(projectId)}/logs`,
    ),

  /** Account-wide Chat-Deploy success metrics (deploy-health panel). */
  deployMetrics: () =>
    request<{
      total: number;
      live: number;
      failed: number;
      successRatePct: number;
      byFailureReason: Record<string, number>;
      byTrigger: Record<string, { total: number; live: number }>;
    }>(`/deploy/metrics`),

  /** Kick off a mobile (Android/iOS) build. iOS returns 409 ios_coming_soon;
   *  non-mobile projects return 422 not_a_mobile_app. */
  buildMobile: (
    projectId: string,
    input: {
      platform: "android" | "ios";
      artifactKind?: "aab" | "apk";
      versionName?: string;
    },
  ) =>
    request<ApiMobileBuild>(
      `/projects/${encodeURIComponent(projectId)}/mobile/builds`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Mobile builds for a project, newest first. */
  listMobileBuilds: (projectId: string) =>
    request<{ builds: ApiMobileBuild[] }>(
      `/projects/${encodeURIComponent(projectId)}/mobile/builds`,
    ),

  /** Publish a succeeded build to a store track. App Store returns 409
   *  app_store_coming_soon; unfinished builds return 409 build_not_ready. */
  publishMobileRelease: (
    projectId: string,
    input: {
      buildId: string;
      store: "google_play" | "app_store";
      track?: "internal" | "alpha" | "beta" | "production";
    },
  ) =>
    request<ApiStoreRelease>(
      `/projects/${encodeURIComponent(projectId)}/mobile/releases`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Store releases for a project, newest first. */
  listStoreReleases: (projectId: string) =>
    request<{ releases: ApiStoreRelease[] }>(
      `/projects/${encodeURIComponent(projectId)}/mobile/releases`,
    ),

  listEnv: (projectId: string, opts?: { reveal?: boolean }) =>
    request<{ env: ApiEnvVar[] }>(
      `/projects/${encodeURIComponent(projectId)}/env${opts?.reveal ? "?reveal=1" : ""}`,
    ),

  setEnv: (
    projectId: string,
    input: { key: string; value: string; secret?: boolean; scope?: "production" | "preview" | "all" },
  ) =>
    request<ApiEnvVar>(`/projects/${encodeURIComponent(projectId)}/env`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  addDomain: (projectId: string, hostname: string) =>
    request<{
      domain: ApiDomain;
      dns: { type: "CNAME" | "A"; name: string; value: string };
      ssl: "issuing" | "active";
    }>(`/projects/${encodeURIComponent(projectId)}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname }),
    }),

  scale: (
    projectId: string,
    input: {
      vcpu?: number;
      memoryMb?: number;
      diskGb?: number;
      alwaysOn?: boolean;
      desiredInstances?: number;
      minInstances?: number;
      maxInstances?: number;
    },
  ) =>
    request<ApiProject>(`/projects/${encodeURIComponent(projectId)}/scale`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Change the project's subdomain. The live URL switches on the next
  // deploy — the server normalises (slugifies) the value and enforces
  // global uniqueness.
  renameSlug: (projectId: string, slug: string) =>
    request<ApiProject>(`/projects/${encodeURIComponent(projectId)}/slug`, {
      method: "POST",
      body: JSON.stringify({ slug }),
    }),

  listInstances: (projectId: string) =>
    request<{ instances: ApiInstance[] }>(
      `/projects/${encodeURIComponent(projectId)}/instances`,
    ),

  provisionDb: (
    projectId: string,
    engine: "postgres" | "mysql" | "mongodb" | "redis" = "postgres",
  ) =>
    request<ApiManagedDatabase>(`/projects/${encodeURIComponent(projectId)}/database`, {
      method: "POST",
      body: JSON.stringify({ engine }),
    }),

  rollback: (projectId: string, deploymentId: string) =>
    request<ApiDeployment>(
      `/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(deploymentId)}`,
      { method: "POST" },
    ),

  troubleshootDeploy: (projectId: string, deploymentId: string) =>
    request<ApiTroubleshootResult>(
      `/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/troubleshoot`,
    ),

  connectGit: (
    projectId: string,
    input: { repoUrl: string; branch?: string; autoDeploy?: boolean },
  ) =>
    request<{
      project: ApiProject;
      webhookSecret: string;
      webhookUrl: string;
    }>(`/projects/${encodeURIComponent(projectId)}/git`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  rotateWebhookSecret: (projectId: string) =>
    request<{ project: ApiProject; webhookSecret: string }>(
      `/projects/${encodeURIComponent(projectId)}/git/rotate-secret`,
      { method: "POST" },
    ),

  /* ----- preview environments (plan §5.1) ----- */

  listPreviews: (projectId: string) =>
    request<{ previews: ApiDeployment[] }>(
      `/projects/${encodeURIComponent(projectId)}/previews`,
    ),

  deployPreview: (
    projectId: string,
    branch: string,
    commit?: { hash?: string; message?: string },
  ) =>
    request<ApiDeployOutcome>(
      `/projects/${encodeURIComponent(projectId)}/previews`,
      { method: "POST", body: JSON.stringify({ branch, commit }) },
    ),

  destroyPreview: (projectId: string, deploymentId: string) =>
    request<ApiDeployment>(
      `/projects/${encodeURIComponent(projectId)}/previews/${encodeURIComponent(deploymentId)}`,
      { method: "DELETE" },
    ),

  /* ----- backups (plan §5.5) ----- */

  listBackups: (projectId: string) =>
    request<{ backups: ApiBackup[] }>(
      `/projects/${encodeURIComponent(projectId)}/backups`,
    ),

  createBackup: (projectId: string, note?: string) =>
    request<ApiBackup>(
      `/projects/${encodeURIComponent(projectId)}/backups`,
      { method: "POST", body: JSON.stringify({ note }) },
    ),

  restoreBackup: (projectId: string, backupId: string) =>
    request<ApiDeployment>(
      `/projects/${encodeURIComponent(projectId)}/backups/${encodeURIComponent(backupId)}/restore`,
      { method: "POST" },
    ),

  deleteBackup: (projectId: string, backupId: string) =>
    request<void>(
      `/projects/${encodeURIComponent(projectId)}/backups/${encodeURIComponent(backupId)}`,
      { method: "DELETE" },
    ),

  disconnectGit: (projectId: string) =>
    request<ApiProject>(`/projects/${encodeURIComponent(projectId)}/git`, {
      method: "DELETE",
    }),

  simulatePush: (
    projectId: string,
    input: {
      branch?: string;
      commit?: { hash?: string; message?: string; author?: string };
    },
  ) =>
    request<ApiDeployOutcome | { skipped: boolean; error: string }>(
      `/projects/${encodeURIComponent(projectId)}/git/webhook`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  listApiKeys: (accountId?: string) =>
    request<{ keys: ApiKeySummary[] }>(
      accountId
        ? `/api-keys?accountId=${encodeURIComponent(accountId)}`
        : `/api-keys`,
    ),

  createApiKey: (input: {
    name: string;
    scope?: "read" | "deploy" | "admin";
    accountId?: string;
  }) =>
    request<{ key: ApiKeySummary; rawKey: string }>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ ...input }),
    }),

  revokeApiKey: (id: string) =>
    request<void>(`/api-keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /* ----- accounts (plan §5.4 — tenant root) ----- */

  whoami: () => request<ApiWhoami>("/me"),

  getAccountMe: () => request<ApiAccount>("/accounts/me"),

  /** Self-service password change for the signed-in user (plan §5.4).
   *  The control plane verifies the current password before writing the
   *  new hash; on failure the response body is `{ error: string }`. */
  changeMyPassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) =>
    request<{ userId: string }>("/account/me/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Begin the /forgot password reset flow (plan §5.4 / v1.18). Always
   *  returns `{ ok: true }` regardless of whether the email is on file —
   *  the Console renders a generic confirmation. When the stub MTA is
   *  wired the response also carries `debugLink` so dev/smoke flows can
   *  complete the round-trip without an inbox. */
  requestPasswordReset: (input: { email: string }) =>
    request<{ ok: true; debugLink?: string }>("/auth/forgot", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Complete the /forgot flow with the token from the email link. */
  completePasswordReset: (input: { token: string; newPassword: string }) =>
    request<{ userId: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Request a new email-verify link for the signed-in user. */
  requestEmailVerification: () =>
    request<{ ok: true; debugLink?: string }>(
      "/auth/verify-email/request",
      { method: "POST", body: "{}" },
    ),

  /** Complete the email-verify flow with the token from the email link. */
  completeEmailVerification: (input: { token: string }) =>
    request<{ userId: string; verifiedAt: string }>(
      "/auth/verify-email/confirm",
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Plan §5.5 — white-label per-account branding. Patches the
   *  currently-resolved account (act-as honoured at the proxy /
   *  control plane). Pass empty string to clear a field; omit it
   *  to leave it untouched. */
  updateBranding: (patch: {
    brandPrimaryColor?: string;
    brandAccentColor?: string;
    brandLogoUrl?: string;
    brandDisplayName?: string;
  }) =>
    request<ApiAccount>("/accounts/me/branding", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  /** Plan §5.5 — billing-rollup. Caller must be the parent. */
  enrollBillingRollup: (subAccountId: string) =>
    request<ApiAccount>(
      `/accounts/${encodeURIComponent(subAccountId)}/billing-rollup`,
      { method: "POST" },
    ),

  leaveBillingRollup: (subAccountId: string) =>
    request<ApiAccount>(
      `/accounts/${encodeURIComponent(subAccountId)}/billing-rollup`,
      { method: "DELETE" },
    ),

  /** Provision a new tenant. Works as the bootstrap path on a fresh
   *  control plane (no auth needed) or as the admin onboarding path for
   *  existing admin-scope callers. Returns the new account + one-time
   *  raw admin key. */
  createAccount: (input: {
    accountName: string;
    accountHandle: string;
    plan?: ApiAccountPlan;
    keyName?: string;
    keyScope?: "read" | "deploy" | "admin";
  }) =>
    request<{
      account: ApiAccount;
      key: ApiKeySummary;
      rawKey: string;
    }>("/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** White-label / reseller — sub-accounts (plan §5.5). The caller must
   *  be on a reseller-eligible plan (agency / dedicated). */
  listSubAccounts: () =>
    request<{ accounts: ApiAccount[] }>("/accounts/sub"),

  createSubAccount: (input: {
    name: string;
    handle: string;
    plan?: ApiAccountPlan;
    keyName?: string;
    keyScope?: "read" | "deploy" | "admin";
  }) =>
    request<{
      account: ApiAccount;
      key: ApiKeySummary;
      rawKey: string;
    }>("/accounts/sub", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /* ----- registrar (plan §4.7 — Cantila Domains) ----- */

  searchDomains: (q: string, tlds?: string) =>
    request<{ results: DomainQuote[] }>(
      `/domains/search?q=${encodeURIComponent(q)}${tlds ? `&tlds=${encodeURIComponent(tlds)}` : ""}`,
    ),

  registerDomain: (input: {
    hostname: string;
    years?: number;
    projectId?: string;
    accountId?: string;
  }) =>
    request<{ registration: DomainRegistration; invoiceCents: number; attached?: ApiDomain }>(
      "/domains/registrations",
      {
        method: "POST",
        body: JSON.stringify({ ...input }),
      },
    ),

  listRegistrations: (accountId?: string) =>
    request<{ registrations: DomainRegistration[] }>(
      accountId
        ? `/domains/registrations?accountId=${encodeURIComponent(accountId)}`
        : `/domains/registrations`,
    ),

  attachRegistration: (registrationId: string, projectId: string) =>
    request<{ registration: DomainRegistration; attached: ApiDomain }>(
      `/domains/registrations/${encodeURIComponent(registrationId)}/attach`,
      { method: "POST", body: JSON.stringify({ projectId }) },
    ),

  /* ----- Cantila Data (plan §4.6) ----- */

  listAccountDatabases: (accountId?: string) =>
    request<{ databases: AccountManagedDatabase[] }>(
      accountId
        ? `/databases?accountId=${encodeURIComponent(accountId)}`
        : `/databases`,
    ),

  listBuckets: (accountId?: string) =>
    request<{ buckets: ApiStorageBucket[] }>(
      accountId
        ? `/storage/buckets?accountId=${encodeURIComponent(accountId)}`
        : `/storage/buckets`,
    ),

  createBucket: (input: {
    projectId: string;
    name: string;
    publicRead?: boolean;
    cdn?: boolean;
  }) =>
    request<ApiStorageBucket>("/storage/buckets", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteBucket: (id: string) =>
    request<void>(`/storage/buckets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /* ----- hosted mailboxes (plan §4.4 — Cantila Mail) ----- */

  listHostedMailboxes: (accountId?: string) =>
    request<{ mailboxes: ApiHostedMailbox[] }>(
      accountId
        ? `/mailboxes?accountId=${encodeURIComponent(accountId)}`
        : `/mailboxes`,
    ),

  listProjectHostedMailboxes: (projectId: string) =>
    request<{ mailboxes: ApiHostedMailbox[] }>(
      `/projects/${encodeURIComponent(projectId)}/mailboxes`,
    ),

  createHostedMailbox: (
    projectId: string,
    input: {
      address: string;
      displayName?: string;
      kind?: "personal" | "shared";
      quotaMb?: number;
    },
  ) =>
    request<ApiHostedMailbox & { oneTimePassword?: string }>(
      `/projects/${encodeURIComponent(projectId)}/mailboxes`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  deleteHostedMailbox: (projectId: string, mailboxId: string) =>
    request<void>(
      `/projects/${encodeURIComponent(projectId)}/mailboxes/${encodeURIComponent(mailboxId)}`,
      { method: "DELETE" },
    ),

  /* ----- mail aliases (plan §4.4 — routing rules) ----- */

  listAccountMailAliases: () =>
    request<{ aliases: ApiMailAlias[] }>("/mail/aliases"),

  listProjectMailAliases: (projectId: string) =>
    request<{ aliases: ApiMailAlias[] }>(
      `/projects/${encodeURIComponent(projectId)}/aliases`,
    ),

  createMailAlias: (
    projectId: string,
    input: {
      address: string;
      target: string;
      kind?: ApiMailAliasKind;
      description?: string;
    },
  ) =>
    request<ApiMailAlias>(
      `/projects/${encodeURIComponent(projectId)}/aliases`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  updateMailAlias: (
    projectId: string,
    aliasId: string,
    patch: {
      target?: string;
      kind?: ApiMailAliasKind;
      active?: boolean;
      description?: string;
    },
  ) =>
    request<ApiMailAlias>(
      `/projects/${encodeURIComponent(projectId)}/aliases/${encodeURIComponent(aliasId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  deleteMailAlias: (projectId: string, aliasId: string) =>
    request<void>(
      `/projects/${encodeURIComponent(projectId)}/aliases/${encodeURIComponent(aliasId)}`,
      { method: "DELETE" },
    ),

  listActivity: (accountId?: string, limit = 100) =>
    request<{ events: ApiActivityEvent[] }>(
      accountId
        ? `/activity?accountId=${encodeURIComponent(accountId)}&limit=${limit}`
        : `/activity?limit=${limit}`,
    ),

  /* ----- A2P/10DLC registrations (plan §4.5) ----- */

  listA2pRegistrations: (kind?: "brand" | "campaign") =>
    request<{ registrations: ApiA2pRegistration[] }>(
      `/a2p/registrations${kind ? `?kind=${kind}` : ""}`,
    ),

  registerA2pBrand: (input: {
    name: string;
    payload: Record<string, unknown>;
  }) =>
    request<ApiA2pRegistration>("/a2p/brands", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  registerA2pCampaign: (input: {
    name: string;
    brandRegistrationId: string;
    payload: Record<string, unknown>;
  }) =>
    request<ApiA2pRegistration>("/a2p/campaigns", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  setA2pRegistrationStatus: (
    id: string,
    input: {
      status: ApiA2pRegistrationStatus;
      providerRegistrationId?: string;
      rejectionReason?: string;
    },
  ) =>
    request<ApiA2pRegistration>(
      `/a2p/registrations/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),

  getMonitoring: (accountId?: string, fresh = false) =>
    request<ApiMonitoringSnapshot>(
      accountId
        ? `/monitoring?accountId=${encodeURIComponent(accountId)}${fresh ? "&fresh=1" : ""}`
        : `/monitoring${fresh ? "?fresh=1" : ""}`,
    ),

  getBillingSummary: (accountId?: string) =>
    request<ApiBillingSummary>(
      accountId
        ? `/billing/summary?accountId=${encodeURIComponent(accountId)}`
        : `/billing/summary`,
    ),

  /** Real Stripe invoice history — finalised invoices with Stripe-hosted
   *  view + PDF links (plan §8.5 — Phase B). */
  getBillingInvoices: () =>
    request<{ invoices: ApiBillingInvoice[] }>(`/billing/invoices`),

  getCostOptimisation: (accountId?: string) =>
    request<ApiCostOptimisationReport>(
      accountId
        ? `/cost/optimise?accountId=${encodeURIComponent(accountId)}`
        : `/cost/optimise`,
    ),

  createCheckoutSession: (input: {
    tier: ApiCheckoutTier;
    uiMode?: "hosted" | "embedded";
    successUrl?: string;
    cancelUrl?: string;
    returnUrl?: string;
  }) =>
    request<ApiCheckoutSession>(`/billing/checkout-session`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Create a Stripe billing-portal session — the hosted page where the
   *  customer manages their payment method, plan and invoice history. */
  createBillingPortalSession: (input: { returnUrl?: string } = {}) =>
    request<ApiBillingPortalSession>(`/billing/portal-session`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Billing-health readout — the dunning state machine's view of the
   *  account (plan §8 / §15.2). Powers the Billing page banner. */
  getDunning: () => request<ApiDunningStatus>(`/billing/dunning`),

  /** Preview the proration for a mid-period plan change (plan §8 / §15.2). */
  previewPlanChange: (tier: ApiCheckoutTier) =>
    request<ApiProrationPreview>(`/billing/plan-change/preview`, {
      method: "POST",
      body: JSON.stringify({ tier }),
    }),

  /** Commit a mid-period plan change with proration. */
  changePlan: (input: {
    tier: ApiCheckoutTier;
    prorationBehavior?: "create_prorations" | "always_invoice" | "none";
  }) =>
    request<ApiPlanChangeResult>(`/billing/plan-change`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getAiInfo: () => request<{ label: string; live: boolean }>(`/ai/info`),
  getMailInfo: () => request<{ label: string; live: boolean }>(`/mail/info`),
  getBillingInfo: () =>
    request<ApiBillingInfo>(`/billing/info`),

  setAnthropicKey: (apiKey: string) =>
    request<ApiAccount>(`/accounts/me/anthropic-key`, {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    }),
  clearAnthropicKey: () =>
    request<ApiAccount>(`/accounts/me/anthropic-key`, { method: "DELETE" }),

  setClaudeSubscriptionToken: (token: string) =>
    request<ApiAccount>(`/accounts/me/claude-subscription`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  clearClaudeSubscriptionToken: () =>
    request<ApiAccount>(`/accounts/me/claude-subscription`, { method: "DELETE" }),

  agentsStatus: (fresh = false) =>
    request<ApiAgentsSnapshot>(
      `/agents/status${fresh ? "?fresh=1" : ""}`,
    ),
  agentsTick: () => request<ApiAgentsSnapshot>("/agents/tick", { method: "POST" }),
  agentsPause: () => request<{ paused: boolean }>("/agents/pause", { method: "POST" }),
  agentsResume: () => request<{ paused: boolean }>("/agents/resume", { method: "POST" }),
  getAgentOrg: () => request<ApiAgentOrg>("/agents/org"),

  /** Owner-only — queue a new agent for the brain. The control plane
   *  persists it as a "proposed" row; the canvas paints it dimmed until
   *  a real TS agent class is wired up. Scope tags the source
   *  (`suggested:<id>` for promoted suggestions, undefined for freeform
   *  chat commands) so the dashboard can later distinguish them. */
  createAgentProposal: (input: {
    name: string;
    blurb: string;
    scope?: string;
  }) =>
    request<ApiAgentProposalRow>("/agents/proposals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listAgentProposals: () =>
    request<{ proposals: ApiAgentProposalRow[] }>("/agents/proposals"),

  getCapacity: (accountId?: string) =>
    request<ApiCapacityRollup>(
      accountId
        ? `/capacity?accountId=${encodeURIComponent(accountId)}`
        : `/capacity`,
    ),

  /* compute nodes — Bring-Your-Own-VPS (plan §5.5) */

  listNodes: () => request<{ nodes: ApiNode[] }>("/nodes"),

  getNodeFleetSummary: () => request<ApiNodeFleetSummary>("/nodes/summary"),

  enrollNode: (input: {
    label: string;
    region?: string;
    host?: string;
    sshUser?: string;
    capacityInstances?: number;
    kind?: ApiNodeKind;
  }) =>
    request<{ node: ApiNode; enrollmentToken: string }>("/nodes", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  retireNode: (id: string) =>
    request<{ node: ApiNode }>(`/nodes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  completeNodeEnrollment: (input: {
    enrollmentToken: string;
    publicKeyFingerprint: string;
    capacityInstances?: number;
  }) =>
    request<{ node: ApiNode }>("/nodes/complete", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getMailFleet: (accountId?: string) =>
    request<{
      mailboxes: ApiMailboxRow[];
      sendingDomains: { domain: string; mailboxes: number; projects: string[] }[];
    }>(
      accountId
        ? `/mail/fleet?accountId=${encodeURIComponent(accountId)}`
        : `/mail/fleet`,
    ),

  getSmsFleet: (accountId?: string) =>
    request<{ numbers: ApiPhoneNumberRow[] }>(
      accountId
        ? `/sms/fleet?accountId=${encodeURIComponent(accountId)}`
        : `/sms/fleet`,
    ),

  /** Account-wide SMS OTP / 2FA rollup (plan §4.5 / §15.2). */
  getOtpStats: () => request<ApiOtpStats>(`/sms/otp`),

  /** Account-wide persisted inbound SMS message history (plan §4.5 —
   *  two-way SMS). */
  getSmsInbox: () =>
    request<{ messages: ApiInboundMessage[] }>(`/sms/inbox`),

  /** Account-wide persisted inbound mail history (plan §4.4 — two-way mail). */
  getMailInbox: () =>
    request<{ messages: ApiInboundMail[] }>(`/mail/inbox`),

  /** Per-pool deliverability rollup (plan §4.4 — IP-pool rotation).
   *  MailAgent reads the same shape to reason about per-pool reputation. */
  getMailPoolDeliverability: (sinceMinutes = 60) =>
    request<{
      sinceIso?: string;
      pools: ApiMailPoolDeliverability[];
    }>(`/mail/pool-deliverability?sinceMinutes=${sinceMinutes}`),

  /** Account-wide persisted inbound voice-call history (plan §4.5). */
  getVoiceCalls: () =>
    request<{ calls: ApiInboundCall[] }>(`/voice/calls`),

  /** Read a project number's inbound call-routing rule (plan §4.5). */
  getCallRouting: (projectId: string) =>
    request<ApiCallRouting>(
      `/projects/${encodeURIComponent(projectId)}/voice/routing`,
    ),

  /** Set a project number's inbound call-routing rule (plan §4.5). */
  setCallRouting: (projectId: string, input: ApiCallRouting) =>
    request<ApiCallRouting>(
      `/projects/${encodeURIComponent(projectId)}/voice/routing`,
      { method: "PUT", body: JSON.stringify(input) },
    ),

  /** Activate SMS on a project (opt-in). Provisions a real carrier number
   *  and wires it into the project. `e164` optional — omit to take the
   *  first available number in `country`. */
  activateSms: (
    projectId: string,
    input: {
      country: string;
      numberType?: string;
      capabilities?: string[];
      e164?: string;
    },
  ) =>
    request<ApiPhoneNumber>(
      `/projects/${encodeURIComponent(projectId)}/sms/activate`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Deactivate SMS on a project — releases the number + stops billing. */
  deactivateSms: (projectId: string) =>
    request<{ ok: true }>(
      `/projects/${encodeURIComponent(projectId)}/sms/deactivate`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  /* ----- number marketplace (plan §4.5) ----- */

  /** Search the phone-number marketplace catalog. */
  searchNumberCatalog: (q: {
    country?: string;
    type?: string;
    areaCode?: string;
  }) => {
    const params = new URLSearchParams();
    if (q.country) params.set("country", q.country);
    if (q.type) params.set("type", q.type);
    if (q.areaCode) params.set("areaCode", q.areaCode);
    const qs = params.toString();
    return request<{ numbers: ApiCatalogNumber[] }>(
      `/numbers/catalog${qs ? `?${qs}` : ""}`,
    );
  },

  /** Purchase a number from the marketplace. */
  purchaseNumber: (input: {
    e164: string;
    country: string;
    numberType: string;
    capabilities: string[];
    projectId?: string;
  }) =>
    request<ApiMarketplaceNumber>(`/numbers`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** List the marketplace numbers the account owns. */
  listOwnedNumbers: () =>
    request<{ numbers: ApiMarketplaceNumber[] }>(`/numbers`),

  /** Release a marketplace number. */
  releaseNumber: (id: string) =>
    request<ApiMarketplaceNumber>(`/numbers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /** Transfer a marketplace number to another account by handle. */
  transferNumber: (id: string, toAccountHandle: string) =>
    request<ApiMarketplaceNumber>(
      `/numbers/${encodeURIComponent(id)}/transfer`,
      { method: "POST", body: JSON.stringify({ toAccountHandle }) },
    ),

  /** Port in a number the account already owns at another carrier. The
   *  number is held in `porting` status until `completePortIn` confirms
   *  it — and is not billed until then (plan §4.5). */
  portInNumber: (input: {
    e164: string;
    country: string;
    numberType: string;
    capabilities: string[];
    projectId?: string;
  }) =>
    request<ApiMarketplaceNumber>(`/numbers/port-in`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Confirm a port-in — flips `porting` → `active` and starts billing.
   *  In production the carrier reports this via a webhook; offline we
   *  drive it directly. */
  completePortIn: (id: string) =>
    request<ApiMarketplaceNumber>(
      `/numbers/${encodeURIComponent(id)}/complete-port`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  listMembers: (accountId?: string) =>
    request<{ members: ApiTeamMember[] }>(
      accountId
        ? `/team/members?accountId=${encodeURIComponent(accountId)}`
        : `/team/members`,
    ),

  addMember: (input: {
    email: string;
    name: string;
    role?: ApiMemberRole;
    accountId?: string;
  }) =>
    request<ApiTeamMember>("/team/members", {
      method: "POST",
      body: JSON.stringify({ ...input }),
    }),

  updateMemberRole: (membershipId: string, role: ApiMemberRole) =>
    request<ApiTeamMember>(
      `/team/members/${encodeURIComponent(membershipId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    ),

  removeMember: (membershipId: string) =>
    request<void>(`/team/members/${encodeURIComponent(membershipId)}`, {
      method: "DELETE",
    }),

  /* invites (plan §5.4 — per-user invite flow) */

  listInvites: () =>
    request<{ invites: ApiInvite[] }>("/invites"),

  createInvite: (input: { email: string; role?: ApiMemberRole }) =>
    request<{ invite: ApiInvite; token: string }>("/invites", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  revokeInvite: (inviteId: string) =>
    request<ApiInvite>(`/invites/${encodeURIComponent(inviteId)}`, {
      method: "DELETE",
    }),

  /** Public — looks up an invite by raw token for the accept page. The
   *  server returns a public-safe view (no token, no internals). */
  lookupInviteByToken: (token: string) =>
    request<{
      id: string;
      email: string;
      role: ApiMemberRole;
      accountId: string;
      accountName: string;
      status: ApiInvite["status"];
      expiresAt: string;
    }>(`/invites/by-token/${encodeURIComponent(token)}`),

  /** Public — accepts an invite with the raw token. Returns the minted
   *  session token (the Console writes it to the `cantila_session`
   *  cookie via a server action). */
  acceptInvite: (input: { token: string; name?: string; password?: string }) =>
    request<{
      token: string;
      expiresAt: string;
      user: { id: string; email: string; name: string };
      accountId: string;
    }>("/invites/accept", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /* multi-org tenancy (plan §18 — Option B). Session-only routes — the
     proxy forwards the `cantila_session` cookie as a Bearer cts_ token. */

  listMyOrgs: () =>
    request<{
      orgs: {
        accountId: string;
        accountName: string;
        handle: string;
        role: ApiMemberRole;
        membershipId: string;
        /** Plan §5.5 — white-label. Set when the row was surfaced
         *  because the user is a member of the agency parent, not a
         *  direct member of this sub-account. The Console renders
         *  "via parent: <name>" and suppresses the Leave button on
         *  these synthetic rows (leaving a sub-account you reached
         *  through parenthood is meaningless — the parent membership
         *  is what grants the access). */
        viaParentAccountId?: string;
      }[];
      currentAccountId: string;
    }>("/me/orgs"),

  switchOrg: (accountId: string) =>
    request<{ ok: true; accountId: string }>("/me/orgs/switch", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    }),

  leaveOrg: (accountId: string) =>
    request<{ ok: true }>("/me/orgs/leave", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    }),

  /* ---------- Cantila Automations (plan §4.10) ---------- */

  listAutomations: (kind?: ApiAutomationKind) =>
    request<{ automations: ApiAutomation[] }>(
      `/automations${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`,
    ),

  createAutomation: (input: {
    kind: ApiAutomationKind;
    name: string;
    region?: ApiRegion;
  }) =>
    request<{ automation: ApiAutomation }>("/automations", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getAutomation: (id: string) =>
    request<{ automation: ApiAutomation }>(
      `/automations/${encodeURIComponent(id)}`,
    ),

  deleteAutomation: (id: string) =>
    request<void>(`/automations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  listNodeTypes: (automationId: string) =>
    request<{ nodeTypes: ApiNodeTypeDescriptor[] }>(
      `/automations/${encodeURIComponent(automationId)}/node-types`,
    ),

  listWorkflows: (automationId: string) =>
    request<{ workflows: ApiWorkflowSummary[] }>(
      `/automations/${encodeURIComponent(automationId)}/workflows`,
    ),

  /** Real workflows from the live platform n8n / OpenClaw instances. */
  liveWorkflows: (kind: "n8n" | "openclaw") =>
    request<{
      configured: boolean;
      workflows: { id: string; name: string; active: boolean; updatedAt?: string }[];
      error?: string;
    }>(`/automations/live/${kind}/workflows`),

  saveWorkflow: (automationId: string, graph: ApiWorkflowGraph) =>
    request<{ workflow: ApiWorkflowGraph }>(
      `/automations/${encodeURIComponent(automationId)}/workflows`,
      { method: "POST", body: JSON.stringify(graph) },
    ),

  loadWorkflow: (automationId: string, workflowId: string) =>
    request<{ workflow: ApiWorkflowGraph }>(
      `/automations/${encodeURIComponent(automationId)}/workflows/${encodeURIComponent(workflowId)}`,
    ),

  /** Import an already-built n8n workflow from its export JSON (n8n's
   *  *Download* / *Copy to clipboard* output). The control plane converts
   *  it to the canonical graph and creates a fresh workflow, returning it
   *  ready to open on the canvas. n8n automations only. */
  importWorkflow: (
    automationId: string,
    input: { workflow: Record<string, unknown>; name?: string },
  ) =>
    request<{ workflow: ApiWorkflowGraph }>(
      `/automations/${encodeURIComponent(automationId)}/workflows/import`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  runWorkflow: (automationId: string, workflowId: string, input?: unknown) =>
    request<{ executionId: string }>(
      `/automations/${encodeURIComponent(automationId)}/workflows/${encodeURIComponent(workflowId)}/run`,
      { method: "POST", body: JSON.stringify({ input }) },
    ),

  getExecution: (automationId: string, executionId: string) =>
    request<{ execution: ApiExecutionState }>(
      `/automations/${encodeURIComponent(automationId)}/executions/${encodeURIComponent(executionId)}`,
    ),

  /** Returns the *path* (e.g. `/api/cantila/automations/.../stream`) the
   *  browser EventSource should open. The proxy adds the auth header so
   *  the browser doesn't need to. */
  executionStreamUrl: (automationId: string, executionId: string) =>
    `${API_BASE}/automations/${encodeURIComponent(automationId)}/executions/${encodeURIComponent(executionId)}/stream`,

  getAutomationsInfo: () =>
    request<{ kinds: { kind: ApiAutomationKind; label: string; live: boolean }[] }>(
      "/automations/info",
    ),

  /** Captured execution history for an automation (plan §15.5 Phase F).
   *  Returns the recent run summaries; pass `workflowId` to filter to
   *  one workflow. The full event tape is on the detail endpoint. */
  listExecutions: (
    automationId: string,
    opts: { workflowId?: string; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (opts.workflowId) q.set("workflowId", opts.workflowId);
    if (opts.limit) q.set("limit", String(opts.limit));
    const qs = q.toString();
    return request<{ executions: ApiCapturedExecution[] }>(
      `/automations/${encodeURIComponent(automationId)}/executions${qs ? `?${qs}` : ""}`,
    );
  },

  /** Full captured run including the persisted event tape. */
  getCapturedExecution: (automationId: string, executionId: string) =>
    request<{ execution: ApiCapturedExecutionDetail }>(
      `/automations/${encodeURIComponent(automationId)}/executions/${encodeURIComponent(executionId)}/events`,
    ),

  /** Replay a previously-captured execution (plan §15.5 Phase F). The
   *  engine runs the same workflow again; a fresh capture row is
   *  written with `replayOfId` pointing at the source. */
  replayExecution: (automationId: string, executionId: string) =>
    request<{ executionId: string; replayOfId: string }>(
      `/automations/${encodeURIComponent(automationId)}/executions/${encodeURIComponent(executionId)}/replay`,
      { method: "POST" },
    ),

  /** Push a Cantila Connection into an automation's engine for one
   *  run, with a real credential payload when the wiring is complete
   *  (plan §15.5 Phase F). Returns the engine-side credential id and
   *  whether the bind pushed real bytes or stayed a placeholder. */
  bindConnection: (automationId: string, connectionId: string) =>
    request<{ engineCredentialId: string; expiresAt: string; pushed: boolean }>(
      `/automations/${encodeURIComponent(automationId)}/connections/${encodeURIComponent(connectionId)}/bind`,
      { method: "POST" },
    ),

  /** Tear down a previously-bound engine credential. Symmetric to
   *  `bindConnection`. */
  unbindConnection: (
    automationId: string,
    engineCredentialId: string,
    connectionId?: string,
  ) =>
    request<void>(
      `/automations/${encodeURIComponent(automationId)}/credentials/${encodeURIComponent(engineCredentialId)}/unbind`,
      { method: "POST", body: JSON.stringify({ connectionId }) },
    ),

  /** Recent bind / unbind events for a connection (plan §15.5 Phase F). */
  listConnectionAudit: (connectionId: string) =>
    request<{ events: ApiConnectionAuditEvent[] }>(
      `/connections/${encodeURIComponent(connectionId)}/audit`,
    ),

  /** Account-wide bind / unbind audit feed. */
  listAccountConnectionAudit: () =>
    request<{ events: ApiConnectionAuditEvent[] }>(`/connections/audit`),

  /* ---------- Cantila Connections (plan §4.11) ---------- */

  listConnections: () =>
    request<{ connections: ApiConnection[] }>("/connections"),

  listProviders: () =>
    request<{ providers: ApiProviderDescriptor[] }>("/connections/providers"),

  getConnection: (id: string) =>
    request<{ connection: ApiConnection }>(
      `/connections/${encodeURIComponent(id)}`,
    ),

  createConnection: (input: {
    provider: string;
    name: string;
    fields: Record<string, string>;
  }) =>
    request<{ connection: ApiConnection }>("/connections", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteConnection: (id: string) =>
    request<void>(`/connections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /** Mint the provider's authorize URL — the Console redirects the
   *  user's browser to it. The control plane signs a one-time state
   *  token and the callback exchanges the code for tokens. */
  startOAuth: (input: {
    provider: string;
    name?: string;
    returnTo?: string;
  }) => {
    const q = new URLSearchParams({ provider: input.provider });
    if (input.name) q.set("name", input.name);
    if (input.returnTo) q.set("returnTo", input.returnTo);
    return request<{ authorizeUrl: string }>(
      `/connections/oauth/start?${q.toString()}`,
    );
  },
};

/* ---------- Cantila Automations + Connections — wire shapes ---------- */

export type ApiAutomationKind = "n8n" | "openclaw";

export interface ApiAutomation {
  id: string;
  kind: ApiAutomationKind;
  name: string;
  slug: string;
  status: ApiProjectStatus;
  region: ApiRegion;
  alwaysOn: boolean;
  createdAt: string;
  adminUrl: string;
  /** Native workspace UI URL — set once the container is provisioned. */
  workspaceUrl?: string;
  workspaceAdminUser?: string;
}

export interface ApiNodeTypeDescriptor {
  id: string;
  kind: ApiAutomationKind;
  name: string;
  category: string;
  blurb: string;
  glyph: string;
  parameters: Record<string, unknown>;
  requiresConnection: boolean;
  connectionProviders?: string[];
}

export interface ApiWorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  lastRunAt?: string;
  lastRunStatus?: "success" | "failed" | "running";
}

export type ApiExecutionStatus = "queued" | "running" | "success" | "failed";

export interface ApiExecutionState {
  id: string;
  workflowId: string;
  status: ApiExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  nodeStates: Record<string, "pending" | "running" | "success" | "failed">;
  error?: string;
}

export type ApiExecutionEventKind =
  | "execution_started"
  | "execution_finished"
  | "node_started"
  | "node_succeeded"
  | "node_failed";

export interface ApiExecutionEvent {
  at: string;
  executionId: string;
  nodeId?: string;
  kind: ApiExecutionEventKind;
  detail?: string;
}

export interface ApiWorkflowGraph {
  id: string;
  name: string;
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number };
    parameters: Record<string, unknown>;
    connectionId?: string;
  }[];
  edges: {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    fromPort?: string;
  }[];
  triggers: {
    id: string;
    kind: "manual" | "webhook" | "schedule";
    config?: Record<string, unknown>;
  }[];
  meta?: Record<string, unknown>;
}

/** Captured execution row (list view) — plan §15.5 Phase F. */
export interface ApiCapturedExecution {
  id: string;
  automationId: string;
  workflowId: string;
  workflowName?: string;
  status: ApiExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  /** If this is a replay, the source execution id. */
  replayOfId?: string;
  /** How many events were captured in the tape (a cheap sparkline cue). */
  eventCount: number;
  nodeStates?: Record<string, "pending" | "running" | "success" | "failed">;
  error?: string;
}

/** Captured execution detail — the row plus the full event tape. */
export interface ApiCapturedExecutionDetail {
  id: string;
  automationId: string;
  accountId: string;
  workflowId: string;
  workflowName?: string;
  status: ApiExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  events: ApiExecutionEvent[];
  nodeStates?: Record<string, "pending" | "running" | "success" | "failed">;
  replayOfId?: string;
  error?: string;
}

/** Credential-binding audit event (plan §15.5 Phase F). */
export interface ApiConnectionAuditEvent {
  id: string;
  accountId: string;
  connectionId: string;
  automationId?: string;
  kind: "bind" | "unbind";
  engineLabel: string;
  engineCredentialId: string;
  pushed: boolean;
  expiresAt?: string;
  error?: string;
  at: string;
}

export type ApiConnectionAuthKind = "oauth" | "api_key" | "basic";
export type ApiConnectionStatus = "active" | "expired" | "broken";

export interface ApiConnection {
  id: string;
  provider: string;
  name: string;
  authKind: ApiConnectionAuthKind;
  status: ApiConnectionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface ApiProviderApiKeyField {
  key: string;
  label: string;
  secret: boolean;
  hint?: string;
}

export interface ApiProviderDescriptor {
  id: string;
  name: string;
  blurb: string;
  glyph: string;
  iconUrl?: string;
  authKinds: ApiConnectionAuthKind[];
  oauth?: { scopes: string[]; requiresRedirect: true };
  apiKey?: {
    fields: ApiProviderApiKeyField[];
    testUrl?: string;
  };
}

export type ApiMemberRole = "owner" | "admin" | "developer" | "viewer";

export interface ApiInvite {
  id: string;
  accountId: string;
  email: string;
  role: ApiMemberRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  invitedByUserId?: string;
  acceptedByUserId?: string;
}

export interface ApiTeamMember {
  id: string;
  accountId: string;
  userId: string;
  email: string;
  name: string;
  role: ApiMemberRole;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface ApiMailboxRow {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  address: string;
  sendingDomain: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string; // masked
  status: "provisioning" | "active" | "sleeping" | "error";
  createdAt: string;
}

export interface ApiPhoneNumberRow {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  e164: string;
  region: ApiRegion;
  status: "provisioning" | "active" | "sleeping" | "error";
  apiKey: string; // masked
  /** What the number can do — `sms` / `mms` / `voice` (plan §4.5). */
  capabilities: string[];
  callRoutingAction?: "forward" | "voicemail" | "reject" | "app_webhook";
  callRoutingTarget?: string;
  createdAt: string;
}

export type ApiPlanTier = "hobby" | "starter" | "pro" | "agency" | "dedicated";

export interface ApiBillingPlan {
  tier: ApiPlanTier;
  name: string;
  priceCents: number;
  tagline: string;
  limits: {
    projects: number;
    bandwidthGb: number;
    storageGb: number;
    monthlyEmails: number;
    monthlySms: number;
  };
}

export interface ApiUsageMeter {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

export interface ApiInvoiceLineItem {
  id: string;
  kind: "subscription" | "domain" | "compute" | "bandwidth" | "storage";
  description: string;
  amountCents: number;
  at: string;
}

export interface ApiBillingSummary {
  plan: ApiBillingPlan;
  periodStart: string;
  periodEnd: string;
  monthToDateCents: number;
  projectedCents: number;
  usage: ApiUsageMeter[];
  recentCharges: ApiInvoiceLineItem[];
  catalog: ApiBillingPlan[];
}

export type ApiCheckStatus = "up" | "degraded" | "down";

export interface ApiUptimeMonitor {
  projectId: string;
  projectSlug: string;
  projectName: string;
  url: string;
  region: ApiRegion;
  status: ApiCheckStatus;
  uptimePct: number;
  responseMs: number;
  history: ApiCheckStatus[];
  lastCheckedAt?: string;
}

export interface ApiMonitoringAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  projectId?: string;
  at: string;
}

export interface ApiStatusComponent {
  name: string;
  status: ApiCheckStatus;
  reason?: string;
}

export type ApiIncidentState =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

export interface ApiIncident {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  state: ApiIncidentState;
  projectId?: string;
  startedAt: string;
  duration: string;
  summary: string;
  updates: { at: string; state: ApiIncidentState; note: string }[];
}

export interface ApiMonitoringSnapshot {
  at: string;
  monitors: ApiUptimeMonitor[];
  alerts: ApiMonitoringAlert[];
  statusComponents: ApiStatusComponent[];
  incidents: ApiIncident[];
  summary: {
    monitorsUp: number;
    monitorsDegraded: number;
    monitorsDown: number;
    avgUptimePct: number;
    activeAlerts: number;
    openIncidents: number;
  };
}

export type ApiActivityKind =
  | "deploy"
  | "domain"
  | "database"
  | "storage"
  | "git"
  | "config"
  | "key"
  | "alert"
  | "system";

export type ApiA2pRegistrationKind = "brand" | "campaign";

export type ApiA2pRegistrationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "hold";

export interface ApiA2pRegistration {
  id: string;
  accountId: string;
  kind: ApiA2pRegistrationKind;
  name: string;
  status: ApiA2pRegistrationStatus;
  /** Brand registration id this campaign belongs to. Set only on
   *  `kind === "campaign"` rows. */
  brandRegistrationId?: string;
  /** The carrier / TCR's id for this registration once submission
   *  goes through. Set when status walks past `draft`. */
  providerRegistrationId?: string;
  rejectionReason?: string;
  /** Free-form regulatory metadata — brand vs campaign fields are
   *  validated by the control plane against `kind`. Examples for
   *  brand: `legalName`, `ein`, `vertical`, `country`, optional
   *  `dba`, `website`. For campaign: `useCase`, `description`,
   *  `sampleMessages: string[]`, optional `optInFlow`, `ageGated`. */
  payload: Record<string, unknown>;
  createdAt: string;
  submittedAt?: string;
  resolvedAt?: string;
}

export interface ApiActivityEvent {
  id: string;
  accountId: string;
  kind: ApiActivityKind;
  title: string;
  detail: string;
  projectId?: string;
  /** Plan §5.5 — white-label audit. Set when an actor different from
   *  the target account drove this event (an agency parent acting as
   *  a sub-account via X-Cantila-Act-As). Absent for normal events. */
  actorAccountId?: string;
  at: string;
}

export interface ApiStorageBucket {
  id: string;
  projectId: string;
  name: string;
  region: ApiRegion;
  publicRead: boolean;
  cdn: boolean;
  objects: number;
  sizeGb: number;
  createdAt: string;
}

/** A hosted mailbox — a real inbox (plan §4.4), distinct from the
 *  auto-wired transactional mailbox surfaced by `/v1/mail/fleet`. */
export type ApiMailAliasKind = "alias" | "forward" | "catch-all" | "parse";

export interface ApiMailAlias {
  id: string;
  projectId: string;
  address: string;
  target: string;
  kind: ApiMailAliasKind;
  active: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHostedMailbox {
  id: string;
  projectId: string;
  address: string;
  displayName: string;
  kind: "personal" | "shared";
  quotaMb: number;
  usedMb: number;
  status: string;
  createdAt: string;
}

export interface AccountManagedDatabase extends ApiManagedDatabase {
  projectSlug: string;
  projectName: string;
}

export interface DomainQuote {
  hostname: string;
  tld: string;
  available: boolean;
  pricePerYearCents: number;
  pricePerYearDisplay: string;
}

export interface DomainRegistration {
  id: string;
  accountId: string;
  hostname: string;
  tld: string;
  pricePerYearCents: number;
  expiresAt: string;
  whoisPrivacy: boolean;
  autoRenew: boolean;
  attachedProjectId?: string;
  createdAt: string;
}

export interface ApiKeySummary {
  id: string;
  accountId: string;
  name: string;
  scope: "read" | "deploy" | "admin";
  prefix: string;
  lastUsedAt?: string;
  createdAt: string;
}

export type ApiAccountPlan =
  | "hobby"
  | "starter"
  | "pro"
  | "agency"
  | "dedicated";

export interface ApiAccount {
  id: string;
  name: string;
  handle: string;
  plan: ApiAccountPlan;
  /** Present on sub-accounts under an agency / reseller parent
   *  (plan §5.5 — white-label). Absent on top-level accounts. */
  parentAccountId?: string;
  /** Stripe `Customer.id` — populated after bootstrap by the Stripe rail
   *  (plan §8 / §15.1). Absent on accounts created before the rail
   *  landed; the Console treats null as "not yet wired". */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Per-tenant Anthropic API key (plan §4.3.1). Always **masked** to
   *  prefix + bullets on read — the raw value is only echoed by the
   *  set endpoint's response, never on subsequent fetches. Absent when
   *  the tenant hasn't configured a key (analysis runs on the
   *  platform-default analyser). */
  anthropicApiKey?: string;
  /** Per-tenant claude.ai subscription OAuth token (§BYO-subscription). Always
   *  masked on read ("oauth••••••••"). Absent when not configured — fleet runs
   *  on platform-default credentials. */
  claudeSubscriptionToken?: string;
  /** Plan §5.5 — white-label per-account branding. All optional;
   *  the Console layout picks them up to re-skin the chrome for
   *  the active session. */
  brandPrimaryColor?: string;
  brandAccentColor?: string;
  brandLogoUrl?: string;
  brandDisplayName?: string;
  /** Plan §5.5 — white-label billing-rollup. When set, this account
   *  does NOT carry its own Stripe subscription; charges route to
   *  the referenced account's bill. */
  billedToAccountId?: string;
  createdAt: string;
}

export type ApiCheckoutTier = "hobby" | "starter" | "pro" | "agency";

export interface ApiCheckoutSession {
  id: string;
  /** `hosted` → redirect to `url`; `embedded` → mount `clientSecret`
   *  in-page (plan §8.5 — Phase D). */
  uiMode: "hosted" | "embedded";
  url: string;
  clientSecret?: string;
  tier: ApiCheckoutTier;
}

export interface ApiBillingPortalSession {
  id: string;
  url: string;
}

/** A real Stripe invoice — finalised billing record with Stripe-hosted
 *  view + PDF links (plan §8.5 — Phase B). Mirrors the control plane's
 *  `StripeInvoice`. */
export interface ApiBillingInvoice {
  id: string;
  number: string | null;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  amountCents: number;
  amountPaidCents: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

/** Account billing health, driven by the dunning state machine
 *  (plan §8 / §15.2). */
export type ApiBillingStatus =
  | "active"
  | "past_due"
  | "suspended"
  | "canceled";

export interface ApiDunningNotice {
  accountId: string;
  template: string;
  subject: string;
  body: string;
  at: string;
}

export interface ApiDunningStatus {
  accountId: string;
  billingStatus: ApiBillingStatus;
  dunningAttempts: number;
  failedAt: string | null;
  graceEndsAt: string | null;
  deployBlocked: boolean;
  policy: { maxAttempts: number; graceDays: number };
  notices: ApiDunningNotice[];
}

/** One line on a proration preview — a credit (negative) or charge. */
export interface ApiProrationLine {
  description: string;
  amountCents: number;
}

/** Preview of what a mid-period plan change costs (plan §8 / §15.2). */
export interface ApiProrationPreview {
  fromTier: string;
  toTier: string;
  creditCents: number;
  chargeCents: number;
  /** Net settled now — positive = charged, negative = credited. */
  amountDueCents: number;
  remainingFraction: number;
  prorationDate: string;
  periodEnd: string;
  isUpgrade: boolean;
  lines: ApiProrationLine[];
  /** `"stripe"` = Stripe's authoritative cent-exact figures
   *  (`invoices.createPreview`); `"estimate"` = the deterministic local
   *  computation — the stub, or the live adapter degrading on a Stripe
   *  error (plan §8.5 — Phase C). */
  source: "stripe" | "estimate";
}

/** Result of committing a mid-period plan change. */
export interface ApiPlanChangeResult {
  subscriptionId: string;
  fromTier: string;
  toTier: string;
  amountDueCents: number;
  invoicedNow: boolean;
  prorationBehavior: string;
  preview: ApiProrationPreview;
}

/** One row of the public TLD pricebook (plan §4.7). */
export interface ApiPublicTldPrice {
  tld: string; //  e.g. ".com"
  perYear: string; //  e.g. "$8.99"
  retail?: string; //  e.g. "$12–20"
  note?: string;
}

/** One marketing plan tier (plan §8.2). */
export interface ApiPublicPlanTier {
  slug: "hobby" | "starter" | "pro" | "agency" | "dedicated";
  name: string;
  price: string;
  priceCadence?: string;
  best: string;
  bullets: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

/** Shape of `GET /v1/billing/info` — Stripe adapter status + the
 *  marketing pricebook the apex /pricing page renders. */
export interface ApiBillingInfo {
  label: string;
  live: boolean;
  publishableKey?: string;
  tldPrices?: ApiPublicTldPrice[];
  planTiers?: ApiPublicPlanTier[];
}

/** One SMS OTP challenge — safe view, no code (plan §4.5 / §15.2). */
export interface ApiOtpChallenge {
  id: string;
  projectId: string;
  phoneMasked: string;
  purpose: string;
  status: "pending" | "verified" | "expired" | "failed";
  createdAt: string;
  expiresAt: string;
  attemptsRemaining: number;
}

/** Account-wide SMS OTP / 2FA rollup. */
export interface ApiOtpStats {
  active: number;
  issued: number;
  verified: number;
  failed: number;
  expired: number;
  verifyRatePct: number;
  recent: ApiOtpChallenge[];
}

/** A persisted inbound mail message (plan §4.4 — two-way mail history).
 *  Mirrors the control plane's `InboundMail`. */
export interface ApiInboundMail {
  id: string;
  accountId: string;
  projectId: string;
  toAddress: string;
  fromAddress: string;
  subject: string;
  body: string;
  providerMessageId: string;
  matchedAliasId?: string;
  routedTo?: string;
  receivedAt: string;
}

/** One row of the per-pool deliverability rollup (plan §4.4 — IP-pool
 *  rotation). Same numerator/denominator shape as the per-domain rollup
 *  but grouped by the in-memory event's `poolId`. */
export interface ApiMailPoolDeliverability {
  poolId: string;
  poolName: string;
  poolKind: "warmup" | "main" | "transactional" | "marketing";
  reputation: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  deferred: number;
  bounceRatePct: number;
  complaintRatePct: number;
}

/** A persisted inbound SMS message (plan §4.5 — two-way SMS history).
 *  Mirrors the control plane's `InboundMessage`. */
export interface ApiInboundMessage {
  id: string;
  accountId: string;
  projectId: string;
  toE164: string;
  fromE164: string;
  body: string;
  keyword?: "stop" | "start" | "help";
  providerMessageId: string;
  receivedAt: string;
}

/** A persisted inbound voice call (plan §4.5 — two-way voice history).
 *  Mirrors the control plane's `InboundCallRecord`. */
export interface ApiInboundCall {
  id: string;
  accountId: string;
  projectId: string;
  toE164: string;
  fromE164: string;
  providerCallId: string;
  routingAction: "forward" | "voicemail" | "reject" | "app_webhook";
  receivedAt: string;
}

/** A project number's inbound call-routing rule (plan §4.5). */
export interface ApiCallRouting {
  action: "forward" | "voicemail" | "reject" | "app_webhook";
  target?: string;
}

/** An available number in the marketplace catalog (plan §4.5). */
export interface ApiCatalogNumber {
  e164: string;
  country: string;
  type: string;
  capabilities: string[];
  setupPriceCents: number;
  monthlyPriceCents: number;
}

/** A marketplace number an account owns. */
export interface ApiMarketplaceNumber {
  id: string;
  accountId: string;
  e164: string;
  country: string;
  numberType: string;
  capabilities: string[];
  setupPriceCents: number;
  monthlyPriceCents: number;
  status: "active" | "porting" | "released";
  providerId: string;
  projectId?: string;
  purchasedAt: string;
  releasedAt?: string;
}

export interface ApiBackup {
  id: string;
  projectId: string;
  accountId: string;
  deploymentId: string;
  envVars: Array<{
    key: string;
    value: string;
    secret: boolean;
    scope: "production" | "preview" | "all";
  }>;
  databaseSnapshotId: string | null;
  note?: string;
  trigger: "manual" | "auto-pre-deploy";
  createdAt: string;
}

export type ApiWhoami =
  | { authenticated: false }
  | {
      authenticated: true;
      accountId: string;
      keyName: string;
      scope: "read" | "deploy" | "admin";
      prefix: string;
      account: ApiAccount | null;
      /** Surfaced only for session callers (plan §5.4 / v1.18) — API-key
       *  callers don't carry a user identity. `emailVerifiedAt` is the
       *  ISO timestamp of verification, or `null` if not yet verified. */
      user?: {
        id: string;
        email: string;
        name: string;
        emailVerifiedAt: string | null;
        /** Profile image (Google/GitHub OAuth or uploaded), or null. */
        avatarUrl?: string | null;
      } | null;
    };

export type ApiAgentName =
  | "uptime"
  | "deploy"
  | "cost"
  | "scale"
  | "security"
  | "capacity"
  | "mail"
  | "sms"
  | "automation";

/** Fleet capacity rollup served by `GET /v1/capacity`. The same shape
 *  CapacityAgent in the brain consumes — surfacing it on the Console
 *  shows the operator the picture the agent is reasoning over. */
/* compute nodes — Bring-Your-Own-VPS (plan §5.5) */

export type ApiNodeKind = "managed" | "byo";
export type ApiNodeStatus =
  | "pending"
  | "active"
  | "degraded"
  | "offline"
  | "retired";

/** Per-account rollup the Console summary header reads. Mirrors
 *  `cp.getNodeFleetSummary`. */
export interface ApiNodeFleetSummary {
  total: number;
  byStatus: {
    pending: number;
    active: number;
    degraded: number;
    offline: number;
    retired: number;
  };
  onlineCapacity: number;
  onlineReported: number;
  byo: number;
}

export interface ApiNode {
  id: string;
  accountId: string;
  kind: ApiNodeKind;
  label: string;
  region: string;
  host: string;
  sshUser: string;
  enrollmentTokenHash: string;
  enrollmentTokenPrefix: string;
  publicKeyFingerprint?: string;
  capacityInstances: number;
  status: ApiNodeStatus;
  reportedInstances?: number;
  reportedLoadPct?: number;
  enrolledAt?: string;
  lastHeartbeatAt?: string;
  retiredAt?: string;
  createdAt: string;
}

/** A single row in the per-node fleet rollup. `region` is a string
 *  (not `ApiRegion`) because BYO-VPS nodes (plan §5.5) carry their own
 *  free-text region label alongside the synthesised platform nodes
 *  whose region matches the `ApiRegion` enum. */
export interface ApiCapacityNode {
  nodeId: string;
  region: string;
  instances: number;
  capacity: number;
  loadPct: number;
  /** Present on BYO node rows; distinguishes tenant-supplied nodes
   *  from synthesised platform-fleet rows. */
  kind?: "managed" | "byo";
  reportedAt?: string;
}

export interface ApiCapacityRegion {
  region: string;
  nodes: number;
  instances: number;
  capacity: number;
  loadPct: number;
}

export interface ApiCapacityRollup {
  nodes: ApiCapacityNode[];
  regions: ApiCapacityRegion[];
  totals: {
    nodes: number;
    instances: number;
    capacity: number;
    loadPct: number;
  };
  nodeCapacity: number;
}
export type ApiAgentConfidence = "high" | "medium" | "low";
export type ApiAgentActionClass = "safe" | "destructive";

export interface ApiAgentObservation {
  at: string;
  agent: ApiAgentName;
  kind: string;
  detail: string;
  projectId?: string;
}

export interface ApiAgentProposal {
  id: string;
  at: string;
  agent: ApiAgentName;
  kind: string;
  title: string;
  body: string;
  confidence: ApiAgentConfidence;
  actionClass: ApiAgentActionClass;
  projectId?: string;
  hints?: { label: string; hint: string }[];
}

export type ApiAgentActionVerified = "n/a" | "pending" | "ok" | "failed";

export interface ApiAgentAction {
  at: string;
  proposalId: string;
  agent: ApiAgentName;
  kind: string;
  title: string;
  outcome: "ok" | "failed";
  detail: string;
  /** Post-check result. "n/a" means the proposal had no verifier;
   *  "pending" means execute succeeded and the verifier is scheduled
   *  but hasn't fired yet. */
  verified: ApiAgentActionVerified;
  verifiedAt?: string;
  verifyDetail?: string;
  resultProjectId?: string;
}

export interface ApiAgentLearning {
  agent: ApiAgentName;
  kind: string;
  attempts: number;
  successes: number;
  failures: number;
  successRatePct: number;
  lastOutcome: "ok" | "failed";
  lastAt: string;
  downgrading: boolean;
}

export interface ApiAgentsSnapshot {
  at: string;
  paused: boolean;
  observations: ApiAgentObservation[];
  pendingProposals: ApiAgentProposal[];
  recentActions: ApiAgentAction[];
  agentStats: Record<ApiAgentName, { observations: number; actions: number }>;
  learnings: ApiAgentLearning[];
  /** Owner-queued agents that don't have a backend implementation yet.
   *  The Console paints them dimmed/dashed on the agents canvas. */
  proposedAgents?: ApiAgentProposalRow[];
}

export interface ApiAgentProposalRow {
  id: string;
  name: string;
  blurb: string;
  scope?: string;
  status: "proposed" | "implemented" | "rejected";
  createdByEmail: string;
  createdAt: string;
}

export type ApiAgentSessionStatus = "idle" | "working" | "done" | "failed";
export interface ApiOrgAgent { id: string; name: string; model: string; description: string; status: ApiAgentSessionStatus; lastAt?: string; }
export interface ApiOrgDivision { key: string; label: string; agents: ApiOrgAgent[]; }
export interface ApiAgentOrg { divisions: ApiOrgDivision[]; activeBuilds: number; }

export interface ApiCostRecommendation {
  id: string;
  kind:
    | "idle_alwayson"
    | "oversized_ram"
    | "oversized_cpu"
    | "oversized_disk"
    | "stale_project"
    | "unused_bucket"
    | "unused_domain";
  projectId?: string;
  projectName?: string;
  confidence: "high" | "medium" | "low";
  title: string;
  body: string;
  savingsCentsPerMonth: number;
  actions?: { label: string; hint: string }[];
}

export interface ApiCostOptimisationReport {
  at: string;
  accountId: string;
  totalSavingsCentsPerMonth: number;
  recommendations: ApiCostRecommendation[];
}

export interface ApiTroubleshootSuggestion {
  confidence: "high" | "medium" | "low";
  title: string;
  body: string;
  actions?: { label: string; hint: string }[];
}

export interface ApiTroubleshootResult {
  deploymentId: string;
  failed: boolean;
  lastStep?: string;
  suggestions: ApiTroubleshootSuggestion[];
  excerpt: string[];
}

/* ---------- streaming deploys (Server-Sent Events) ---------- */

export interface DeployStepEvent {
  at: string;
  deploymentId: string;
  projectId: string;
  step: string;
}

export interface DeployStreamCallbacks {
  onStart?: (data: { projectId: string; trigger: string }) => void;
  onStep?: (event: DeployStepEvent) => void;
  onDone?: (outcome: ApiDeployOutcome) => void;
  onError?: (message: string) => void;
}

/**
 * Streams a deploy through the Cantila SSE endpoint and invokes the
 * callbacks as each event arrives. Returns a cancel function that aborts
 * the request. `EventSource` is GET-only, so we parse the stream from a
 * POST `fetch` ourselves — small SSE state machine.
 */
export function deployStream(
  projectId: string,
  input: {
    trigger?: ApiDeployTrigger;
    source?: { kind: "git" | "upload" | "chat"; ref?: string };
  } = {},
  callbacks: DeployStreamCallbacks = {},
): () => void {
  const controller = new AbortController();

  void (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/projects/${encodeURIComponent(projectId)}/deploy/stream`,
        {
          method: "POST",
          headers: { "content-type": "application/json", accept: "text/event-stream" },
          body: JSON.stringify(input),
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (!res.ok || !res.body) {
        callbacks.onError?.(`stream failed: ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let sep = buf.indexOf("\n\n");
        while (sep !== -1) {
          const frame = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          dispatchSseFrame(frame, callbacks);
          sep = buf.indexOf("\n\n");
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      callbacks.onError?.(err instanceof Error ? err.message : "stream error");
    }
  })();

  return () => controller.abort();
}

function dispatchSseFrame(frame: string, cb: DeployStreamCallbacks): void {
  let event = "message";
  let dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }
  if (event === "start") cb.onStart?.(payload as { projectId: string; trigger: string });
  else if (event === "step") cb.onStep?.(payload as DeployStepEvent);
  else if (event === "done") cb.onDone?.(payload as ApiDeployOutcome);
  else if (event === "error")
    cb.onError?.((payload as { error: string }).error ?? "stream error");
}

/** Quick liveness probe — returns true if the control plane is reachable. */
export async function isControlPlaneLive(): Promise<boolean> {
  try {
    await api.health();
    return true;
  } catch {
    return false;
  }
}

/* ============================================================
   Complete-builder — deploy planner, per-project chat & brain.
   ============================================================ */

export type ApiDeployPlanKind =
  | "live_app"
  | "static_site"
  | "api"
  | "automation"
  | "worker"
  | "cron"
  | "ai_agent";

export interface ApiDeployPlanMedia {
  logo: boolean;
  hero: boolean;
  favicon: boolean;
  iconSet: boolean;
  heroAnimation: boolean;
  socialOgImage: boolean;
}

export interface ApiDeployPlan {
  kind: ApiDeployPlanKind;
  name: string;
  stack: string;
  runtime: ApiRuntime;
  region: ApiRegion;
  services: {
    needsDatabase: boolean;
    dbEngine?: "postgres" | "mysql" | "mongodb" | "redis";
    needsMail: boolean;
    needsSms: boolean;
  };
  automationKind?: "n8n" | "openclaw";
  templateRef?: string;
  buildPlan: string[];
  media: ApiDeployPlanMedia;
  summary: string;
}

/** A chat conversation thread within a project. Each project has at
 *  least a default "Main" conversation (the backend ensures one), plus
 *  any the user starts via ＋ New chat. */
export interface ApiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastPreview: string;
}

export type ApiProjectMessageRole = "user" | "agent" | "system" | "tool";
export type ApiProjectMessageKind = "message" | "op_card" | "result" | "asset";

export interface ApiProjectMessage {
  id: string;
  projectId: string;
  role: ApiProjectMessageRole;
  agent?: string;
  kind: ApiProjectMessageKind;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ApiProjectAssetKind =
  | "image"
  | "icon"
  | "lottie"
  | "css_anim"
  | "video"
  | "copy"
  | "file";

export interface ApiProjectAsset {
  id: string;
  projectId: string;
  kind: ApiProjectAssetKind;
  path: string;
  mimeType: string;
  width?: number;
  height?: number;
  prompt?: string;
  provider: string;
  sizeBytes: number;
  createdAt: string;
  dataUrl?: string;
}

export interface ApiProjectBrain {
  memory: {
    projectId: string;
    summary: string;
    tokenCount: number;
    lastSummarizedMessageId?: string;
    updatedAt: string;
  };
  messageCount: number;
  assetCount: number;
  lastChangeAt?: string;
}

export interface ApiFileNode {
  path: string;
  type: "blob" | "tree";
  sha: string;
}
export interface ApiFileContent {
  content: string;
  sha: string;
  encoding: "utf-8";
}

export type ProjectStreamEvent =
  | { kind: "plan"; data: ApiDeployPlan }
  | { kind: "agent_message"; agent: string; content: string }
  | { kind: "op_started"; opKey: string; agent: string; title: string }
  | { kind: "op_finished"; opKey: string; agent: string; title: string; detail?: string; status: "ok" | "failed" }
  | { kind: "asset_created"; asset: ApiProjectAsset }
  | { kind: "message_persisted"; message: ApiProjectMessage }
  | { kind: "result"; name: string; url: string; stack: string }
  | { kind: "error"; error: string }
  | { kind: "done" };

export interface ProjectStreamCallbacks {
  onPlan?: (plan: ApiDeployPlan) => void;
  onAgentMessage?: (event: { agent: string; content: string }) => void;
  onOpStarted?: (event: { opKey: string; agent: string; title: string }) => void;
  onOpFinished?: (event: { opKey: string; agent: string; title: string; detail?: string; status: "ok" | "failed" }) => void;
  onAssetCreated?: (asset: ApiProjectAsset) => void;
  onMessage?: (message: ApiProjectMessage) => void;
  onResult?: (result: { name: string; url: string; stack: string }) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export const builderApi = {
  /** Pre-flight to project creation. Sends the chat prompt to the control
   *  plane's Claude-backed planner (rule-based fallback) and gets back a
   *  typed deploy plan the deploy UI can act on. */
  planDeploy: (input: { prompt: string; files?: string[] }) =>
    request<{ plan: ApiDeployPlan }>("/deploy/plan", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Resolve a project from `@handle` + `name`. Powers /@handle/<name>. */
  getProjectByHandle: (handle: string, name: string) => {
    const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
    return request<ApiProjectDetail>(
      `/projects/by-handle/${encodeURIComponent(cleanHandle)}/${encodeURIComponent(name)}`,
    );
  },

  /** Per-project chat history. When `conversationId` is supplied the
   *  history is scoped to that conversation; omitted, the backend serves
   *  the project's default ("Main") conversation. */
  getProjectChat: (projectId: string, conversationId?: string) =>
    request<{ messages: ApiProjectMessage[] }>(
      `/projects/${encodeURIComponent(projectId)}/chat${
        conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ""
      }`,
    ),

  /* ----- conversations (multi-thread chat history) ----- */

  /** List a project's conversations (most-recently-active first). The
   *  backend ensures a default conversation exists before responding. */
  listConversations: (projectId: string) =>
    request<{ conversations: ApiConversation[] }>(
      `/projects/${encodeURIComponent(projectId)}/conversations`,
    ),

  /** Start a new conversation. Title defaults to "New chat" server-side
   *  and is auto-filled from the first user message. */
  createConversation: (projectId: string, title?: string) =>
    request<ApiConversation>(
      `/projects/${encodeURIComponent(projectId)}/conversations`,
      { method: "POST", body: JSON.stringify(title ? { title } : {}) },
    ),

  /** Rename a conversation. */
  renameConversation: (projectId: string, cid: string, title: string) =>
    request<ApiConversation>(
      `/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(cid)}`,
      { method: "PATCH", body: JSON.stringify({ title }) },
    ),

  /** Delete a conversation (cascade-deletes its messages). */
  deleteConversation: (projectId: string, cid: string) =>
    request<void>(
      `/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(cid)}`,
      { method: "DELETE" },
    ),

  /** Per-project asset catalogue (the AssetGallery panel reads this). */
  getProjectAssets: (projectId: string) =>
    request<{ assets: ApiProjectAsset[] }>(
      `/projects/${encodeURIComponent(projectId)}/assets`,
    ),

  /** Per-project brain snapshot — summary + counts. */
  getProjectBrain: (projectId: string) =>
    request<ApiProjectBrain>(`/projects/${encodeURIComponent(projectId)}/brain`),

  /** List files in a project's git tree. */
  getProjectFiles: (projectId: string, ref?: string) =>
    request<{ files: ApiFileNode[] }>(
      `/projects/${encodeURIComponent(projectId)}/files${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
    ),

  /** Same-origin proxy URL for the whole-project .zip archive. Fetch it with
   *  credentials (the session cookie authenticates via the proxy) and save the
   *  resulting blob — it's a real, binary-faithful zip from the git provider. */
  projectArchiveHref: (projectId: string, ref?: string) =>
    `${API_BASE}/projects/${encodeURIComponent(projectId)}/files/archive${
      ref ? `?ref=${encodeURIComponent(ref)}` : ""
    }`,

  /** Same-origin proxy URL for a succeeded mobile build's artifact (.aab/.apk).
   *  Fetch it with credentials — the session cookie authenticates via the
   *  proxy — and save the resulting blob. */
  mobileArtifactHref: (projectId: string, buildId: string) =>
    `${API_BASE}/projects/${encodeURIComponent(projectId)}/mobile/builds/${encodeURIComponent(buildId)}/artifact`,

  /** Get a single file's content from a project. */
  getProjectFileContent: (projectId: string, path: string, ref?: string) =>
    request<ApiFileContent>(
      `/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(path)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }`,
    ),

  /** Create or update a file in a project. */
  putProjectFile: (
    projectId: string,
    input: { path: string; content: string; sha?: string; message?: string },
  ) =>
    request<{ commitSha: string; sha: string }>(
      `/projects/${encodeURIComponent(projectId)}/files/content`,
      { method: "PUT", body: JSON.stringify(input) },
    ),

  /** Delete a file from a project. */
  deleteProjectFile: (projectId: string, path: string, sha: string) =>
    request<{ commitSha: string }>(
      `/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(
        path,
      )}&sha=${encodeURIComponent(sha)}`,
      { method: "DELETE" },
    ),

  /** List running instances for a project. */
  getProjectInstances: (projectId: string) =>
    request<{ instances: { id: string; status: string; cpuPct?: number }[] }>(
      `/projects/${encodeURIComponent(projectId)}/instances`,
    ),

  /** Get recent metrics samples for a project. */
  getProjectMetrics: (projectId: string) =>
    request<{ samples: { cpuPct: number; memPct: number; rps: number; at: string }[] }>(
      `/projects/${encodeURIComponent(projectId)}/metrics`,
    ),
};

/** Stream the orchestrator's build for a freshly-created project. The
 *  project page opens this stream right after the deploy chat creates
 *  the project, so op cards flow into the workspace as they happen. */
export function buildStream(
  projectId: string,
  prompt: string,
  callbacks: ProjectStreamCallbacks = {},
  conversationId?: string,
): () => void {
  return openProjectStream(
    `/projects/${encodeURIComponent(projectId)}/build`,
    conversationId ? { prompt, conversationId } : { prompt },
    callbacks,
  );
}

/** Stream a follow-up chat turn for a project. */
export function chatStream(
  projectId: string,
  message: string,
  callbacks: ProjectStreamCallbacks = {},
  conversationId?: string,
): () => void {
  return openProjectStream(
    `/projects/${encodeURIComponent(projectId)}/chat`,
    conversationId ? { message, conversationId } : { message },
    callbacks,
  );
}

function openProjectStream(
  path: string,
  body: Record<string, unknown>,
  callbacks: ProjectStreamCallbacks,
): () => void {
  const controller = new AbortController();
  void (async () => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body) {
        callbacks.onError?.(`stream failed: ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sep = buf.indexOf("\n\n");
        while (sep !== -1) {
          dispatchProjectFrame(buf.slice(0, sep), callbacks);
          buf = buf.slice(sep + 2);
          sep = buf.indexOf("\n\n");
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      callbacks.onError?.(err instanceof Error ? err.message : "stream error");
    }
  })();
  return () => controller.abort();
}

function dispatchProjectFrame(frame: string, cb: ProjectStreamCallbacks): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }
  switch (event) {
    case "plan":
      cb.onPlan?.(payload as ApiDeployPlan);
      return;
    case "agent_message":
      cb.onAgentMessage?.(payload as { agent: string; content: string });
      return;
    case "op_started":
      cb.onOpStarted?.(payload as { opKey: string; agent: string; title: string });
      return;
    case "op_finished":
      cb.onOpFinished?.(payload as { opKey: string; agent: string; title: string; detail?: string; status: "ok" | "failed" });
      return;
    case "asset_created":
      cb.onAssetCreated?.((payload as { asset: ApiProjectAsset }).asset);
      return;
    case "message_persisted":
      cb.onMessage?.((payload as { message: ApiProjectMessage }).message);
      return;
    case "result":
      cb.onResult?.(payload as { name: string; url: string; stack: string });
      return;
    case "error":
      cb.onError?.((payload as { error: string }).error ?? "stream error");
      return;
    case "done":
      cb.onDone?.();
      return;
  }
}
