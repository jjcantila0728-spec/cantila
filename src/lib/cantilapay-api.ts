/* ============================================================
   Cantila Console — typed client for the Cantilapay surfaces
   on the control plane (plan §25, Phase 6).

   Mirrors the view shapes in cantila-control-plane/src/cantilapay/types.ts.
   Keep in sync.

   All calls go through the same `/api/cantila/[...path]` proxy
   the rest of the Console uses — the Cantilapay tenant key
   (`csk_…` / `cpk_…`) lives only on the control-plane side; the
   Console's Cantila Account session is what gates these routes
   (the control plane's Console-managed surface).
   ============================================================ */

const API_BASE =
  typeof window === "undefined" ? "" : ""; // proxy-relative on the browser
const PROXY = "/api/cantila";

async function request<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const writeMethods = new Set(["POST", "PUT", "PATCH"]);
  const method = (init?.method ?? "GET").toUpperCase();
  const finalBody =
    init?.body !== undefined
      ? init.body
      : writeMethods.has(method)
        ? "{}"
        : undefined;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.idempotencyKey) {
    headers["cantilapay-idempotency-key"] = init.idempotencyKey;
  }
  const res = await fetch(`${API_BASE}${PROXY}${path}`, {
    ...init,
    headers,
    body: finalBody,
    cache: "no-store",
  });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: { message?: string } }).error.message ?? "")
        : "") || `request failed: ${res.status}`;
    throw new Error(message);
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

/* ---------- view shapes (mirror control-plane types.ts) ---------- */

export type CantilapayMode = "test" | "live";

export interface CantilapayAccount {
  id: string;
  accountId: string;
  status: "created" | "onboarding" | "active" | "rejected" | "disabled";
  platformFeeBps: number;
  country: string | null;
  testReady: boolean;
  liveReady: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CantilapayApiKey {
  id: string;
  name: string;
  kind: "publishable" | "secret";
  mode: CantilapayMode;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CantilapayApiKeyIssued extends CantilapayApiKey {
  rawKey: string;
}

export interface CantilapayWebhookEndpoint {
  id: string;
  url: string;
  mode: CantilapayMode;
  enabledEvents: string;
  signingSecretPrefix: string;
  status: "active" | "disabled";
  createdAt: string;
  lastDeliveryAt: string | null;
}

export interface CantilapayPaymentIntent {
  id: string;
  mode: CantilapayMode;
  customerId: string | null;
  paymentMethodId: string | null;
  amount: number;
  amountCaptured: number;
  amountRefunded: number;
  currency: string;
  captureMode: "automatic" | "manual";
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "succeeded"
    | "canceled"
    | "failed";
  platformFeeAmount: number;
  description: string | null;
  metadata: Record<string, string>;
  clientSecret: string | null;
  lastError: { code: string; message: string; declineCode?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CantilapaySubscription {
  id: string;
  mode: CantilapayMode;
  customerId: string;
  priceId: string;
  defaultPaymentMethodId: string | null;
  status:
    | "incomplete"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CantilapayBalance {
  available: number;
  pending: number;
  currency: string;
}

export interface CantilapayPayout {
  id: string;
  mode: CantilapayMode;
  amount: number;
  currency: string;
  status: "pending" | "in_transit" | "paid" | "failed" | "canceled";
  arrivalDate: string;
  periodStart: string;
  periodEnd: string;
  lastError: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CantilapayAuditEntry {
  id: string;
  type: string;
  message: string;
  data: Record<string, unknown> | null;
  apiKeyId: string | null;
  createdAt: string;
}

/* ---------- typed methods ---------- */

export const cantilapayApi = {
  /** Health probe — `{adapter, live}` reflects which PSP rail is wired. */
  health: () =>
    request<{ status: string; service: string; adapter: string; live: boolean }>(
      "/v1/cantilapay/health",
    ),

  /** Enable cantilapay on the signed-in tenant. Idempotent. */
  enable: (country?: string) =>
    request<CantilapayAccount>("/v1/cantilapay/enable", {
      method: "POST",
      body: JSON.stringify({ country }),
    }),

  /** Get the signed-in tenant's cantilapay account. 404 if not enabled. */
  me: () => request<CantilapayAccount>("/v1/cantilapay/me"),

  /** Issue a new tenant API key. Raw key only shown once. */
  issueKey: (input: {
    name: string;
    kind: "publishable" | "secret";
    mode: CantilapayMode;
  }) =>
    request<CantilapayApiKeyIssued>("/v1/cantilapay/api_keys", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listKeys: () =>
    request<{ keys: CantilapayApiKey[] }>("/v1/cantilapay/api_keys"),

  revokeKey: (id: string) =>
    request<CantilapayApiKey>(`/v1/cantilapay/api_keys/${id}`, {
      method: "DELETE",
    }),

  /** Mint a hosted KYC URL for this mode. */
  onboardingLink: (input: {
    mode: CantilapayMode;
    country: string;
    returnUrl: string;
  }) =>
    request<{ url: string; expiresAt: string }>(
      "/v1/cantilapay/onboarding_link",
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Tenant webhook subscriptions. */
  createWebhookEndpoint: (input: {
    url: string;
    mode: CantilapayMode;
    enabledEvents?: string;
  }) =>
    request<CantilapayWebhookEndpoint & { signingSecret: string }>(
      "/v1/cantilapay/webhook_endpoints",
      { method: "POST", body: JSON.stringify(input) },
    ),

  listWebhookEndpoints: () =>
    request<{ endpoints: CantilapayWebhookEndpoint[] }>(
      "/v1/cantilapay/webhook_endpoints",
    ),

  listAudit: (limit = 100) =>
    request<{ entries: CantilapayAuditEntry[] }>(
      `/v1/cantilapay/audit?limit=${limit}`,
    ),
};
