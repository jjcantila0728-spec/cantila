"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Phone,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  KeyRound,
  Check,
  Server,
  Activity as ActivityIcon,
  Zap,
  Loader2,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { PageHeader, StatusBadge, Pill, Button, cx } from "@/components/ui";
import { AreaChart } from "@/components/AreaChart";
import Modal, { Field, inputClass } from "@/components/Modal";
import {
  phoneNumbers as mockPhoneNumbers,
  smsMessages,
  verifications,
  smsVolume,
  smsStats,
  getProject,
  numberSlug,
} from "@/lib/mock-data";
import type {
  PhoneNumber,
  SmsCapability,
  SmsStatus,
  VerificationStatus,
} from "@/lib/types";
import {
  api,
  isControlPlaneLive,
  type ApiOtpStats,
  type ApiCatalogNumber,
  type ApiInboundMessage,
  type ApiInboundCall,
  type ApiCallRouting,
  type ApiPhoneNumberRow,
  type ApiMarketplaceNumber,
} from "@/lib/api";

/* ---------- vocabulary ---------- */

const COUNTRY: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
};

const DIAL: Record<string, string> = { US: "+1", GB: "+44" };

const CAP_BY_TYPE: Record<PhoneNumber["type"], SmsCapability[]> = {
  Local: ["SMS", "MMS", "Voice"],
  "Toll-free": ["SMS", "Voice"],
  "Short code": ["SMS"],
};

/** Map a control-plane capability token (`sms` / `mms` / `voice`) to the
 *  Console's display label (plan §4.5 — per-number capability metadata). */
const CAP_LABEL: Record<string, SmsCapability> = {
  sms: "SMS",
  mms: "MMS",
  voice: "Voice",
};

const SMS_STATUS: Record<
  SmsStatus,
  { tone: "live" | "info" | "ember" | "down"; label: string }
> = {
  delivered: { tone: "live", label: "Delivered" },
  sent: { tone: "ember", label: "Sent" },
  failed: { tone: "down", label: "Failed" },
  received: { tone: "info", label: "Received" },
};

const VERIFY: Record<
  VerificationStatus,
  { tone: "live" | "ember" | "neutral" | "down"; label: string }
> = {
  verified: { tone: "live", label: "Verified" },
  pending: { tone: "ember", label: "Pending" },
  expired: { tone: "neutral", label: "Expired" },
  failed: { tone: "down", label: "Failed" },
};

/** Format an inbound-message timestamp — "May 25, 14:32". */
function formatMsgAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- capability chip ---------- */

function CapChip({ cap }: { cap: SmsCapability }) {
  return (
    <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-ink-dim ring-1 ring-border">
      {cap}
    </span>
  );
}

/* ---------- phone-number card ---------- */

function NumberCard({ n }: { n: PhoneNumber }) {
  const router = useRouter();
  const proj = getProject(n.projectId ?? "");
  const linkable = n.status === "active";
  const href = `/sms/${numberSlug(n.number)}`;

  return (
    <div
      onClick={() => linkable && router.push(href)}
      onKeyDown={(e) => {
        if (
          linkable &&
          (e.key === "Enter" || e.key === " ") &&
          e.target === e.currentTarget
        ) {
          e.preventDefault();
          router.push(href);
        }
      }}
      role={linkable ? "button" : undefined}
      tabIndex={linkable ? 0 : undefined}
      className={cx(
        "panel flex flex-col gap-4 p-5",
        linkable && "cursor-pointer transition-colors hover:border-ink-faint",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-violet">
          <Phone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-mono text-sm text-ink">{n.number}</h3>
          <p className="truncate text-2xs text-ink-faint">
            {n.type} · {COUNTRY[n.country] ?? n.country}
          </p>
        </div>
        <StatusBadge status={n.status} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {n.capabilities.map((c) => (
          <CapChip key={c} cap={c} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3 text-2xs text-ink-faint">
        {proj ? (
          <Link
            href={`/projects/${proj.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-mono text-ink-dim hover:text-ember"
          >
            <ArrowUpRight className="h-3 w-3" />
            {proj.name}
          </Link>
        ) : (
          <span className="font-mono">Unassigned</span>
        )}
        <span>
          <span className="font-mono text-ink-dim">
            {n.sent30d.toLocaleString()}
          </span>{" "}
          sent · 30d
        </span>
      </div>
    </div>
  );
}

/* ---------- call-routing editor row (plan §4.5) ---------- */

const ROUTING_ACTIONS: ApiCallRouting["action"][] = [
  "voicemail",
  "forward",
  "reject",
  "app_webhook",
];

function RoutingRow({ row }: { row: ApiPhoneNumberRow }) {
  const [action, setAction] = useState<ApiCallRouting["action"]>(
    row.callRoutingAction ?? "voicemail",
  );
  const [target, setTarget] = useState(row.callRoutingTarget ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needsTarget = action === "forward" || action === "app_webhook";

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      await api.setCallRouting(row.projectId, {
        action,
        target: needsTarget ? target.trim() : undefined,
      });
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save routing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <Phone className="h-4 w-4 shrink-0 text-violet" />
        <span className="font-mono text-sm text-ink">{row.e164}</span>
        <span className="text-2xs text-ink-faint">{row.projectName}</span>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value as ApiCallRouting["action"]);
            setSaved(false);
          }}
          className={cx(inputClass, "ml-auto h-8 w-36 text-2xs")}
        >
          {ROUTING_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {needsTarget && (
          <input
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setSaved(false);
            }}
            placeholder={
              action === "forward"
                ? "destination E.164 / SIP URI"
                : "app webhook URL"
            }
            className={cx(inputClass, "h-8 w-56 text-2xs")}
          />
        )}
        <button
          onClick={() => void save()}
          disabled={saving || (needsTarget && !target.trim())}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      {err && <p className="mt-1.5 text-2xs text-down">{err}</p>}
    </div>
  );
}

/* ---------- view ---------- */

const COUNTRIES = ["US", "GB"];
const TYPES: PhoneNumber["type"][] = ["Local", "Toll-free", "Short code"];

export default function SmsView() {
  const [nums, setNums] = useState<PhoneNumber[]>(() => [...mockPhoneNumbers]);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  /** Live SMS OTP / 2FA rollup (plan §4.5 / §15.2). Null until the
   *  control plane answers; the Verification API section falls back to
   *  the mock seed when null. */
  const [otp, setOtp] = useState<ApiOtpStats | null>(null);
  /** Persisted inbound SMS message history (plan §4.5). Null until the
   *  control plane answers; the Recent messages section falls back to the
   *  mock seed when null. */
  const [inbound, setInbound] = useState<ApiInboundMessage[] | null>(null);
  /** Raw fleet rows (real project ids + routing) — back the call-routing
   *  editor (plan §4.5). */
  const [fleetRows, setFleetRows] = useState<ApiPhoneNumberRow[]>([]);
  /** Persisted inbound voice-call history (plan §4.5). */
  const [inboundCalls, setInboundCalls] = useState<ApiInboundCall[] | null>(
    null,
  );
  /* ----- number marketplace (plan §4.5) ----- */
  const [ownedNumbers, setOwnedNumbers] = useState<ApiMarketplaceNumber[]>(
    [],
  );
  const [catalog, setCatalog] = useState<ApiCatalogNumber[] | null>(null);
  const [marketForm, setMarketForm] = useState<{
    country: string;
    type: string;
  }>({ country: "US", type: "local" });
  const [searching, setSearching] = useState(false);
  const [buyingE164, setBuyingE164] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  /** Which owned number has its inline transfer form open, + the typed
   *  destination account handle. */
  const [transferId, setTransferId] = useState<string | null>(null);
  const [transferHandle, setTransferHandle] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  /** Port-in form (plan §4.5 — number lifecycle). Held in `porting`
   *  status by the control plane until `completePortIn` confirms it;
   *  not billed until then. */
  const [portInOpen, setPortInOpen] = useState(false);
  const [portInForm, setPortInForm] = useState<{
    e164: string;
    country: string;
    numberType: string;
    capabilities: string[];
  }>({ e164: "", country: "US", numberType: "local", capabilities: ["sms", "voice"] });
  const [portInBusy, setPortInBusy] = useState(false);
  /** Which `porting` number has a "complete" in flight — drives the per-row
   *  spinner so the operator can see the carrier-confirmation step land. */
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        const [fleet, otpStats, owned, inbox, calls] = await Promise.all([
          api.getSmsFleet(),
          api.getOtpStats().catch(() => null),
          api.listOwnedNumbers().catch(() => null),
          api.getSmsInbox().catch(() => null),
          api.getVoiceCalls().catch(() => null),
        ]);
        if (cancelled) return;
        if (otpStats) setOtp(otpStats);
        if (owned) setOwnedNumbers(owned.numbers);
        if (inbox) setInbound(inbox.messages);
        setFleetRows(fleet.numbers);
        if (calls) setInboundCalls(calls.calls);
        const live: PhoneNumber[] = fleet.numbers.map((n) => ({
          number: n.e164,
          country: "US",
          type: "Local",
          // Real per-number capability metadata (plan §4.5) — falls back
          // to the full set for a legacy row that reports none.
          capabilities:
            n.capabilities && n.capabilities.length > 0
              ? n.capabilities
                  .map((c) => CAP_LABEL[c])
                  .filter((c): c is SmsCapability => Boolean(c))
              : ["SMS", "MMS", "Voice"],
          status: n.status === "active" ? "active" : "provisioning",
          projectId: n.projectSlug,
          sent30d: 0,
        }));
        // Live numbers above the mock seed (kept so the demo stays populated
        // when the CP has no projects yet).
        setNums((prev) => [
          ...live,
          ...prev.filter((p) => !live.find((l) => l.number === p.number)),
        ]);
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    country: string;
    type: PhoneNumber["type"];
  }>({ country: "US", type: "Local" });

  const avgPerDay = Math.round(
    smsVolume.reduce((s, v) => s + v, 0) / smsVolume.length,
  );

  /* ----- number marketplace handlers (plan §4.5) ----- */

  function usd(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  async function searchCatalog() {
    setMarketError(null);
    setSearching(true);
    try {
      const res = await api.searchNumberCatalog({
        country: marketForm.country,
        type: marketForm.type,
      });
      setCatalog(res.numbers);
    } catch (err) {
      setMarketError(
        err instanceof Error ? err.message : "Catalog search failed",
      );
    } finally {
      setSearching(false);
    }
  }

  async function buyNumber(n: ApiCatalogNumber) {
    setMarketError(null);
    setBuyingE164(n.e164);
    try {
      const bought = await api.purchaseNumber({
        e164: n.e164,
        country: n.country,
        numberType: n.type,
        capabilities: n.capabilities,
      });
      setOwnedNumbers((prev) => [bought, ...prev]);
      setCatalog((prev) =>
        prev ? prev.filter((c) => c.e164 !== n.e164) : prev,
      );
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBuyingE164(null);
    }
  }

  async function releaseOwnedNumber(numberId: string) {
    setMarketError(null);
    setReleasingId(numberId);
    try {
      const released = await api.releaseNumber(numberId);
      setOwnedNumbers((prev) =>
        prev.map((n) => (n.id === numberId ? released : n)),
      );
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Release failed");
    } finally {
      setReleasingId(null);
    }
  }

  async function portInOwnedNumber() {
    const e164 = portInForm.e164.trim();
    if (!e164) return;
    setMarketError(null);
    setPortInBusy(true);
    try {
      const ported = await api.portInNumber({
        e164,
        country: portInForm.country,
        numberType: portInForm.numberType,
        capabilities: portInForm.capabilities,
      });
      setOwnedNumbers((prev) => [ported, ...prev]);
      setPortInOpen(false);
      setPortInForm({
        e164: "",
        country: "US",
        numberType: "local",
        capabilities: ["sms", "voice"],
      });
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Port-in failed");
    } finally {
      setPortInBusy(false);
    }
  }

  async function completeOwnedPortIn(numberId: string) {
    setMarketError(null);
    setCompletingId(numberId);
    try {
      const confirmed = await api.completePortIn(numberId);
      setOwnedNumbers((prev) =>
        prev.map((n) => (n.id === numberId ? confirmed : n)),
      );
    } catch (err) {
      setMarketError(
        err instanceof Error ? err.message : "Port confirmation failed",
      );
    } finally {
      setCompletingId(null);
    }
  }

  async function transferOwnedNumber(numberId: string) {
    if (!transferHandle.trim()) return;
    setMarketError(null);
    setTransferBusy(true);
    try {
      await api.transferNumber(numberId, transferHandle.trim());
      // The number now belongs to another account — drop it from this
      // account's owned list.
      setOwnedNumbers((prev) => prev.filter((n) => n.id !== numberId));
      setTransferId(null);
      setTransferHandle("");
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransferBusy(false);
    }
  }

  // Recent messages — live persisted inbound history when the control
  // plane is reachable, the mock seed otherwise. Real rows are all
  // inbound (received); outbound history is not persisted.
  const messageRows = inbound
    ? inbound.map((m) => ({
        id: m.id,
        body: m.body,
        from: m.fromE164,
        to: m.toE164,
        status: "received" as SmsStatus,
        direction: "inbound" as const,
        projectId: m.projectId as string | undefined,
        at: formatMsgAt(m.receivedAt),
      }))
    : smsMessages;

  // Verification list — live OTP challenges when the control plane is
  // reachable, the mock seed otherwise.
  const verifyItems = otp
    ? otp.recent.map((ch) => ({
        id: ch.id,
        phone: ch.phoneMasked,
        channel: "SMS" as const,
        projectId: undefined as string | undefined,
        status: ch.status as VerificationStatus,
        at: ch.createdAt.slice(0, 16).replace("T", " "),
      }))
    : verifications;

  function provision() {
    const seq = 200 + nums.length;
    const dial = DIAL[form.country] ?? "+1";
    const number =
      dial === "+44"
        ? `+44 7700 9${String(seq).padStart(5, "0")}`
        : `+1 (555) 555-${String(seq).padStart(4, "0")}`;
    const n: PhoneNumber = {
      number,
      country: form.country,
      type: form.type,
      capabilities: CAP_BY_TYPE[form.type],
      status: "provisioning",
      sent30d: 0,
    };
    setNums((prev) => [n, ...prev]);
    setForm({ country: "US", type: "Local" });
    setModalOpen(false);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Cantila SMS · live fleet" : "Cantila SMS"}
        title="SMS & verification"
        lead="One API for two-way SMS, voice, OTP verification and phone numbers — outbound and inbound texts and calls, system notifications, and number provisioning on a carrier-grade backbone, behind one key and one bill."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> connected
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                control plane offline · mock fleet
              </span>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Provision number
            </button>
          </div>
        }
      />

      {/* rollup */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Phone numbers", v: String(nums.length) },
          { k: "Sent · 30d", v: smsStats.sent30d.toLocaleString() },
          { k: "Delivery rate", v: `${smsStats.deliveryRate}%` },
          {
            k: "Verifications · 30d",
            v: smsStats.verifications30d.toLocaleString(),
          },
        ].map((s) => (
          <div key={s.k} className="panel p-4">
            <div className="kv">{s.k}</div>
            <div className="mt-1.5 font-mono text-lg font-semibold text-ink">
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* first-party infrastructure */}
      <div className="panel relative overflow-hidden p-5">
        <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-16" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-start gap-3 lg:w-64 lg:shrink-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ember/30 bg-ember/10 text-ember">
              <Server className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                Complete telephony surface
              </h3>
              <p className="mt-0.5 text-2xs text-ink-faint">
                Two-way SMS and voice on a carrier-grade backbone —
                Cantila owns the API, OTP engine and number inventory.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Two-way SMS",
              "Voice & voicemail",
              "OTP / 2FA engine",
              "Number provisioning",
              "Inbound routing & webhooks",
              "10DLC / A2P registration",
            ].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-soft bg-surface-2 px-2 py-1 text-2xs text-ink-dim"
              >
                <Check className="h-3 w-3 text-live" strokeWidth={3} />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* outbound volume */}
      <div className="panel p-0">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Outbound volume
            </h2>
            <p className="mt-0.5 text-2xs text-ink-faint">
              Messages sent per day · last 14 days
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-violet/10 px-2 py-1 text-2xs font-medium text-violet ring-1 ring-violet/20">
            <ActivityIcon className="h-3 w-3" />
            Sending
          </span>
        </div>
        <div className="px-2 pt-4">
          <AreaChart data={smsVolume} id="sms-volume" tone="violet" height={132} />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border-soft border-t border-border-soft">
          {[
            { k: "Avg / day", v: avgPerDay.toLocaleString() },
            { k: "Received · 30d", v: smsStats.received30d.toLocaleString() },
            { k: "Verify rate", v: `${smsStats.verifyRate}%` },
          ].map((s) => (
            <div key={s.k} className="px-5 py-3.5">
              <div className="kv">{s.k}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-ink">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* phone numbers */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Phone numbers · {nums.length}</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {nums.map((n) => (
            <NumberCard key={n.number} n={n} />
          ))}
        </div>
      </section>

      {/* number marketplace (plan §4.5) — search the catalog, buy a
          number, and manage the numbers the account owns. */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Number marketplace</h2>
        <div className="panel p-5">
          {marketError && (
            <div className="mb-4 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-2xs text-down">
              {marketError}
            </div>
          )}

          {/* search row */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="kv">Country</span>
              <select
                value={marketForm.country}
                onChange={(e) =>
                  setMarketForm({ ...marketForm, country: e.target.value })
                }
                className={cx(inputClass, "mt-1.5 w-32")}
              >
                {COUNTRIES.map((co) => (
                  <option key={co} value={co}>
                    {co}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="kv">Number type</span>
              <select
                value={marketForm.type}
                onChange={(e) =>
                  setMarketForm({ ...marketForm, type: e.target.value })
                }
                className={cx(inputClass, "mt-1.5 w-40")}
              >
                {["local", "toll_free", "mobile", "short_code"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void searchCatalog()}
              disabled={searching}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
            <button
              onClick={() => setPortInOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
            >
              <ArrowDownLeft className="h-4 w-4" />
              {portInOpen ? "Cancel port-in" : "Port in a number"}
            </button>
          </div>

          {/* port-in form (plan §4.5) — held in `porting` until the
              carrier confirms; not billed until `completePortIn`. */}
          {portInOpen && (
            <div className="mt-4 rounded-lg border border-border-soft bg-surface-2/60 p-4">
              <div className="kv mb-2 text-ink-dim">Port in a number</div>
              <p className="mb-3 text-2xs text-ink-faint">
                Bring a number you already own at another carrier. The number
                is held in <span className="font-mono">porting</span> until
                the carrier confirms the port — billing only begins on
                confirmation.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="kv">E.164</span>
                  <input
                    value={portInForm.e164}
                    onChange={(e) =>
                      setPortInForm({ ...portInForm, e164: e.target.value })
                    }
                    placeholder="+14155550199"
                    className={cx(inputClass, "mt-1.5 w-44 font-mono text-sm")}
                  />
                </label>
                <label className="block">
                  <span className="kv">Country</span>
                  <select
                    value={portInForm.country}
                    onChange={(e) =>
                      setPortInForm({ ...portInForm, country: e.target.value })
                    }
                    className={cx(inputClass, "mt-1.5 w-32")}
                  >
                    {COUNTRIES.map((co) => (
                      <option key={co} value={co}>
                        {co}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kv">Number type</span>
                  <select
                    value={portInForm.numberType}
                    onChange={(e) =>
                      setPortInForm({
                        ...portInForm,
                        numberType: e.target.value,
                      })
                    }
                    className={cx(inputClass, "mt-1.5 w-40")}
                  >
                    {["local", "toll_free", "mobile", "short_code"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <fieldset className="block">
                  <legend className="kv">Capabilities</legend>
                  <div className="mt-1.5 flex h-9 items-center gap-3">
                    {(["sms", "mms", "voice"] as const).map((cap) => {
                      const checked = portInForm.capabilities.includes(cap);
                      return (
                        <label
                          key={cap}
                          className="inline-flex items-center gap-1.5 text-2xs text-ink-dim"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPortInForm({
                                ...portInForm,
                                capabilities: checked
                                  ? portInForm.capabilities.filter(
                                      (c) => c !== cap,
                                    )
                                  : [...portInForm.capabilities, cap],
                              })
                            }
                            className="h-3.5 w-3.5"
                          />
                          {CAP_LABEL[cap] ?? cap}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <button
                  onClick={() => void portInOwnedNumber()}
                  disabled={
                    portInBusy ||
                    !portInForm.e164.trim() ||
                    portInForm.capabilities.length === 0
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
                >
                  {portInBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Start port-in
                </button>
              </div>
            </div>
          )}

          {/* catalog results */}
          {catalog && (
            <div className="mt-4 border-t border-border-soft">
              {catalog.length === 0 ? (
                <p className="py-3 text-2xs text-ink-faint">
                  No numbers available for that search.
                </p>
              ) : (
                <div className="divide-y divide-border-soft">
                  {catalog.map((n) => (
                    <div
                      key={n.e164}
                      className="flex flex-wrap items-center gap-3 py-2.5"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-violet" />
                      <span className="font-mono text-sm text-ink">
                        {n.e164}
                      </span>
                      <span className="text-2xs text-ink-faint">{n.type}</span>
                      <span className="ml-auto font-mono text-2xs text-ink-dim">
                        {usd(n.setupPriceCents)} setup ·{" "}
                        {usd(n.monthlyPriceCents)}/mo
                      </span>
                      <button
                        onClick={() => void buyNumber(n)}
                        disabled={buyingE164 !== null}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
                      >
                        {buyingE164 === n.e164 ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3.5 w-3.5" />
                        )}
                        Buy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* owned numbers */}
          {ownedNumbers.length > 0 && (
            <div className="mt-5">
              <h3 className="kv mb-2 text-ink-dim">
                Your numbers · {ownedNumbers.length}
              </h3>
              <div className="divide-y divide-border-soft">
                {ownedNumbers.map((n) => (
                  <div key={n.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <Phone className="h-4 w-4 shrink-0 text-violet" />
                      <span className="font-mono text-sm text-ink">
                        {n.e164}
                      </span>
                      <span className="text-2xs text-ink-faint">
                        {n.numberType}
                      </span>
                      <Pill
                        tone={
                          n.status === "active"
                            ? "live"
                            : n.status === "porting"
                              ? "ember"
                              : "neutral"
                        }
                      >
                        {n.status}
                      </Pill>
                      <span className="ml-auto font-mono text-2xs text-ink-dim">
                        {usd(n.monthlyPriceCents)}/mo
                      </span>
                      {n.status === "active" && (
                        <>
                          <button
                            onClick={() =>
                              setTransferId(
                                transferId === n.id ? null : n.id,
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-2xs font-medium text-ink-dim transition-colors hover:border-ink-faint disabled:opacity-50"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Transfer
                          </button>
                          <button
                            onClick={() => void releaseOwnedNumber(n.id)}
                            disabled={releasingId !== null}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-2xs font-medium text-ink-dim transition-colors hover:border-down hover:text-down disabled:opacity-50"
                          >
                            {releasingId === n.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Release
                          </button>
                        </>
                      )}
                      {n.status === "porting" && (
                        <button
                          onClick={() => void completeOwnedPortIn(n.id)}
                          disabled={completingId !== null}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
                        >
                          {completingId === n.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Complete port
                        </button>
                      )}
                    </div>
                    {transferId === n.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          value={transferHandle}
                          onChange={(e) => setTransferHandle(e.target.value)}
                          placeholder="destination account handle"
                          className={cx(inputClass, "h-8 max-w-xs text-2xs")}
                        />
                        <button
                          onClick={() => void transferOwnedNumber(n.id)}
                          disabled={transferBusy || !transferHandle.trim()}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
                        >
                          {transferBusy && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          Confirm transfer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* verification API */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Verification API · OTP &amp; 2FA</h2>
        <div className="panel p-0">
          <div className="relative overflow-hidden border-b border-border-soft p-5">
            <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-20" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-ember" />
                  <h3 className="font-display text-sm font-semibold text-ink">
                    One-API phone verification
                  </h3>
                </div>
                <p className="mt-1 max-w-md text-2xs text-ink-faint">
                  Send and check one-time codes over SMS or voice — Cantila
                  handles carrier delivery, code expiry and retries on its own
                  network.
                </p>
                <code className="mt-2 inline-block rounded-md border border-border bg-bg px-2.5 py-1 font-mono text-2xs text-ink-dim">
                  POST sms.cantila.app/v1/verify
                </code>
              </div>
              <div className="flex shrink-0 gap-6">
                <div>
                  <div className="kv">
                    {otp ? "Codes issued" : "Sent · 30d"}
                  </div>
                  <div className="mt-1 font-mono text-xl font-semibold text-ink">
                    {(otp
                      ? otp.issued
                      : smsStats.verifications30d
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="kv">Verify rate</div>
                  <div className="mt-1 font-mono text-xl font-semibold text-live">
                    {otp ? otp.verifyRatePct : smsStats.verifyRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border-soft">
            {verifyItems.map((v) => {
              const ui = VERIFY[v.status];
              const proj = getProject(v.projectId ?? "");
              const Icon = v.channel === "Voice" ? Phone : MessageSquare;
              return (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-ink">{v.phone}</p>
                    <p className="truncate text-2xs text-ink-faint">
                      {v.channel}
                      {proj && (
                        <>
                          {" · "}
                          <Link
                            href={`/projects/${proj.id}`}
                            className="hover:text-ember"
                          >
                            {proj.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <Pill tone={ui.tone}>{ui.label}</Pill>
                  <span className="shrink-0 font-mono text-2xs text-ink-faint">
                    {v.at}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* recent messages — persisted inbound SMS history (plan §4.5)
          when live; the mock seed offline. */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          {inbound ? "Inbound messages" : "Recent messages"}
        </h2>
        <div className="panel overflow-hidden p-0">
          {messageRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-2xs text-ink-faint">
              No inbound messages yet — texts received on your numbers
              appear here.
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {messageRows.map((m) => {
                const ui = SMS_STATUS[m.status];
                const proj = getProject(m.projectId ?? "");
                const outbound = m.direction === "outbound";
                return (
                <div key={m.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={cx(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2",
                      outbound ? "text-violet" : "text-info",
                    )}
                  >
                    {outbound ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{m.body}</p>
                    <p className="truncate font-mono text-2xs text-ink-faint">
                      {m.from} → {m.to}
                      {proj && (
                        <>
                          {" · "}
                          <Link
                            href={`/projects/${proj.id}`}
                            className="hover:text-ember"
                          >
                            {proj.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex">
                    <Pill tone={ui.tone}>{ui.label}</Pill>
                  </span>
                  <span className="shrink-0 font-mono text-2xs text-ink-faint">
                    {m.at}
                  </span>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* call routing (plan §4.5) — per-number inbound-call routing rule;
          editable when the control plane is live. */}
      {fleetRows.length > 0 && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Call routing</h2>
          <div className="panel divide-y divide-border-soft p-0">
            {fleetRows.map((row) => (
              <RoutingRow key={row.id} row={row} />
            ))}
          </div>
          <p className="mt-2 text-2xs text-ink-faint">
            What an inbound call to each number does · forward and
            app-webhook need a destination.
          </p>
        </section>
      )}

      {/* recent calls (plan §4.5) — persisted inbound voice-call history;
          hidden when the control plane is offline. */}
      {inboundCalls !== null && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Recent calls</h2>
          <div className="panel overflow-hidden p-0">
            {inboundCalls.length === 0 ? (
              <div className="px-5 py-8 text-center text-2xs text-ink-faint">
                No inbound calls yet — calls received on your numbers
                appear here.
              </div>
            ) : (
              <div className="divide-y divide-border-soft">
                {inboundCalls.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-info">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-ink">
                        {c.fromE164}
                      </p>
                      <p className="truncate font-mono text-2xs text-ink-faint">
                        → {c.toE164}
                      </p>
                    </div>
                    <Pill tone="neutral">{c.routingAction}</Pill>
                    <span className="shrink-0 font-mono text-2xs text-ink-faint">
                      {formatMsgAt(c.receivedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* provision number modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision a number"
        description="Add an SMS-capable number to send, receive and verify."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={provision}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Provision
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country">
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={inputClass}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY[c] ?? c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number type">
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as PhoneNumber["type"],
                })
              }
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Capabilities" hint="Determined by the number type you choose.">
          <div className="flex flex-wrap gap-1.5">
            {CAP_BY_TYPE[form.type].map((c) => (
              <CapChip key={c} cap={c} />
            ))}
          </div>
        </Field>
      </Modal>
    </div>
  );
}
