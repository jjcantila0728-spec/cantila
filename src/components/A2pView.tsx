"use client";

/* ============================================================
   A2P / 10DLC carrier registration — plan §4.5.

   Mirrors the `cantila a2p` CLI surface in the Console:
    - list brand + campaign registrations with their status
    - register a brand (one form, validated payload)
    - register a campaign under an existing approved brand
    - walk a registration through the approval state machine
      (operator-driven today; the real telephony adapter will
      drive `setA2pRegistrationStatus` from carrier webhooks
      when one is wired)

   Live-only. Offline the page renders an empty state pointing
   the operator at the CLI.
   ============================================================ */

import { useEffect, useState } from "react";
import { Loader2, Plus, Send, ShieldCheck, Tag, X } from "lucide-react";
import { PageHeader, Pill, Button } from "@/components/ui";
import { inputClass } from "@/components/Modal";
import {
  api,
  isControlPlaneLive,
  type ApiA2pRegistration,
  type ApiA2pRegistrationStatus,
} from "@/lib/api";

const STATUS_TONE: Record<
  ApiA2pRegistrationStatus,
  "neutral" | "info" | "warn" | "live" | "down"
> = {
  draft: "neutral",
  submitted: "info",
  in_review: "warn",
  approved: "live",
  rejected: "down",
  hold: "warn",
};

const STATUS_FLOW: ApiA2pRegistrationStatus[] = [
  "draft",
  "submitted",
  "in_review",
  "approved",
];

export default function A2pView() {
  const [registrations, setRegistrations] = useState<ApiA2pRegistration[]>([]);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Brand form
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLegalName, setBrandLegalName] = useState("");
  const [brandEin, setBrandEin] = useState("");
  const [brandVertical, setBrandVertical] = useState("technology");
  const [brandCountry, setBrandCountry] = useState("US");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandBusy, setBrandBusy] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Campaign form
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignBrand, setCampaignBrand] = useState("");
  const [campaignUseCase, setCampaignUseCase] = useState("2fa");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignSamples, setCampaignSamples] = useState("");
  const [campaignOptInFlow, setCampaignOptInFlow] = useState("");
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  // Per-row status update
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function loadRegistrations() {
    try {
      const { registrations } = await api.listA2pRegistrations();
      setRegistrations(registrations);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "load failed");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      void loadRegistrations();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const brands = registrations.filter((r) => r.kind === "brand");
  const approvedBrands = brands.filter((r) => r.status === "approved");

  async function submitBrand() {
    if (brandBusy) return;
    setBrandBusy(true);
    setBrandError(null);
    try {
      const created = await api.registerA2pBrand({
        name: brandName.trim(),
        payload: {
          legalName: brandLegalName.trim(),
          ein: brandEin.trim(),
          vertical: brandVertical,
          country: brandCountry,
          ...(brandWebsite.trim() ? { website: brandWebsite.trim() } : {}),
        },
      });
      setRegistrations((prev) => [created, ...prev]);
      setBrandName("");
      setBrandLegalName("");
      setBrandEin("");
      setBrandWebsite("");
      setBrandOpen(false);
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : "create failed");
    } finally {
      setBrandBusy(false);
    }
  }

  async function submitCampaign() {
    if (campaignBusy) return;
    if (!campaignBrand) {
      setCampaignError("pick a brand to register the campaign under");
      return;
    }
    setCampaignBusy(true);
    setCampaignError(null);
    try {
      const samples = campaignSamples
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const created = await api.registerA2pCampaign({
        name: campaignName.trim(),
        brandRegistrationId: campaignBrand,
        payload: {
          useCase: campaignUseCase,
          description: campaignDescription.trim(),
          sampleMessages: samples,
          ...(campaignOptInFlow.trim()
            ? { optInFlow: campaignOptInFlow.trim() }
            : {}),
        },
      });
      setRegistrations((prev) => [created, ...prev]);
      setCampaignName("");
      setCampaignDescription("");
      setCampaignSamples("");
      setCampaignOptInFlow("");
      setCampaignOpen(false);
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : "create failed");
    } finally {
      setCampaignBusy(false);
    }
  }

  async function walkStatus(
    reg: ApiA2pRegistration,
    next: ApiA2pRegistrationStatus,
  ) {
    if (statusBusyId) return;
    setStatusBusyId(reg.id);
    setStatusError(null);
    try {
      const updated = await api.setA2pRegistrationStatus(reg.id, {
        status: next,
      });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? updated : r)),
      );
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "status update failed");
    } finally {
      setStatusBusyId(null);
    }
  }

  function nextStatus(
    status: ApiA2pRegistrationStatus,
  ): ApiA2pRegistrationStatus | null {
    const i = STATUS_FLOW.indexOf(status);
    if (i === -1 || i === STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[i + 1];
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Compliance · live" : "Compliance"}
        title="A2P / 10DLC registrations"
        lead="Register your brand and campaigns with The Campaign Registry before sending US application-to-person SMS at scale (plan §4.5)."
        actions={
          liveMode === true ? (
            <Pill tone="live">
              <ShieldCheck className="h-3 w-3" />
              live
            </Pill>
          ) : liveMode === false ? (
            <Pill tone="neutral">control plane offline</Pill>
          ) : null
        }
      />

      {liveMode === false ? (
        <div className="panel p-6 text-sm text-ink-dim">
          A2P/10DLC registration data is stored only on the live control
          plane. Connect to it to view, register or update brands and
          campaigns. The same surface is available from the CLI as
          {" "}
          <code className="font-mono text-ink">cantila a2p</code>.
        </div>
      ) : (
        <>
          {loadError && (
            <div className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">
              {loadError}
            </div>
          )}

          {/* Register-a-brand panel */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="kv text-ink-dim flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" /> Brand registrations · {brands.length}
              </h2>
              <button
                onClick={() => {
                  setBrandOpen((p) => !p);
                  setBrandError(null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
              >
                {brandOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {brandOpen ? "Cancel" : "Register brand"}
              </button>
            </div>
            {brandOpen && (
              <div className="panel mb-3 grid gap-3 p-4 sm:grid-cols-2">
                <FieldInput
                  label="Brand name (internal)"
                  value={brandName}
                  onChange={setBrandName}
                  placeholder="acme-brand"
                />
                <FieldInput
                  label="Legal entity name"
                  value={brandLegalName}
                  onChange={setBrandLegalName}
                  placeholder="Acme Inc."
                />
                <FieldInput
                  label="EIN / Tax id"
                  value={brandEin}
                  onChange={setBrandEin}
                  placeholder="12-3456789"
                />
                <FieldInput
                  label="Vertical"
                  value={brandVertical}
                  onChange={setBrandVertical}
                  placeholder="technology"
                />
                <FieldInput
                  label="Country (ISO-2)"
                  value={brandCountry}
                  onChange={setBrandCountry}
                  placeholder="US"
                />
                <FieldInput
                  label="Website (optional)"
                  value={brandWebsite}
                  onChange={setBrandWebsite}
                  placeholder="https://acme.example"
                />
                {brandError && (
                  <div className="sm:col-span-2 text-2xs text-down">
                    {brandError}
                  </div>
                )}
                <div className="sm:col-span-2 flex justify-end">
                  <Button onClick={submitBrand} disabled={brandBusy}>
                    {brandBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Register brand (draft)
                  </Button>
                </div>
              </div>
            )}
            <RegistrationTable
              rows={brands}
              statusBusyId={statusBusyId}
              onWalk={walkStatus}
              nextStatus={nextStatus}
            />
          </section>

          {/* Register-a-campaign panel */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="kv text-ink-dim flex items-center gap-2">
                <Send className="h-3.5 w-3.5" /> Campaign registrations ·{" "}
                {registrations.filter((r) => r.kind === "campaign").length}
              </h2>
              <button
                onClick={() => {
                  setCampaignOpen((p) => !p);
                  setCampaignError(null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
              >
                {campaignOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {campaignOpen ? "Cancel" : "Register campaign"}
              </button>
            </div>
            {campaignOpen && (
              <div className="panel mb-3 grid gap-3 p-4 sm:grid-cols-2">
                <FieldInput
                  label="Campaign name (internal)"
                  value={campaignName}
                  onChange={setCampaignName}
                  placeholder="acme-otp"
                />
                <div>
                  <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                    Parent brand
                  </label>
                  <select
                    value={campaignBrand}
                    onChange={(e) => setCampaignBrand(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a brand…</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.status !== "approved"
                          ? ` (${b.status} — soft warning)`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {approvedBrands.length === 0 && brands.length > 0 && (
                    <p className="mt-1 text-2xs text-warn">
                      No approved brand yet — the CP allows this with a soft
                      warning. Walk a brand to approved first for the real
                      submission.
                    </p>
                  )}
                </div>
                <FieldInput
                  label="Use case"
                  value={campaignUseCase}
                  onChange={setCampaignUseCase}
                  placeholder="2fa | marketing | customer_care"
                />
                <FieldInput
                  label="Opt-in flow (optional)"
                  value={campaignOptInFlow}
                  onChange={setCampaignOptInFlow}
                  placeholder="checkbox at signup"
                />
                <div className="sm:col-span-2">
                  <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                    Description
                  </label>
                  <input
                    type="text"
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="OTP codes for sign-in and high-risk transactions"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                    Sample messages (pipe-separated)
                  </label>
                  <input
                    type="text"
                    value={campaignSamples}
                    onChange={(e) => setCampaignSamples(e.target.value)}
                    placeholder="Your Acme code: 123456 | Acme: tap to verify"
                    className={inputClass}
                  />
                </div>
                {campaignError && (
                  <div className="sm:col-span-2 text-2xs text-down">
                    {campaignError}
                  </div>
                )}
                <div className="sm:col-span-2 flex justify-end">
                  <Button onClick={submitCampaign} disabled={campaignBusy}>
                    {campaignBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Register campaign (draft)
                  </Button>
                </div>
              </div>
            )}
            <RegistrationTable
              rows={registrations.filter((r) => r.kind === "campaign")}
              statusBusyId={statusBusyId}
              onWalk={walkStatus}
              nextStatus={nextStatus}
            />
          </section>

          {statusError && (
            <div className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">
              {statusError}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function RegistrationTable({
  rows,
  statusBusyId,
  onWalk,
  nextStatus,
}: {
  rows: ApiA2pRegistration[];
  statusBusyId: string | null;
  onWalk: (
    reg: ApiA2pRegistration,
    next: ApiA2pRegistrationStatus,
  ) => Promise<void>;
  nextStatus: (
    s: ApiA2pRegistrationStatus,
  ) => ApiA2pRegistrationStatus | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="panel p-4 text-2xs text-ink-faint">
        None yet.
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden p-0">
      <table className="w-full text-2xs">
        <thead className="bg-surface-2 text-ink-dim">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
            <th className="px-4 py-2 text-right font-medium">Walk forward</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((r) => {
            const next = nextStatus(r.status);
            return (
              <tr key={r.id}>
                <td className="px-4 py-2">
                  <div className="font-medium text-ink">{r.name}</div>
                  <div className="font-mono text-ink-faint">{r.id}</div>
                  {r.brandRegistrationId && (
                    <div className="font-mono text-ink-faint">
                      brand: {r.brandRegistrationId}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                  {r.rejectionReason && (
                    <div className="mt-1 text-2xs text-down">
                      {r.rejectionReason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-ink-dim">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  {next ? (
                    <button
                      onClick={() => void onWalk(r, next)}
                      disabled={statusBusyId === r.id}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-50"
                    >
                      {statusBusyId === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      → {next}
                    </button>
                  ) : (
                    <span className="text-ink-faint">terminal</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
