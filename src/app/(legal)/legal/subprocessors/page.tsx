import LegalPage from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Subprocessors · Cantila",
  description: "The third parties Cantila uses to operate the service.",
};

type Row = {
  name: string;
  purpose: string;
  region: string;
  phase: "Live" | "Phase 2" | "Phase 3";
};

const ROWS: Row[] = [
  {
    name: "Hetzner Online GmbH",
    purpose: "Compute, networking, storage — the underlying VPS fleet for Cantila Host and Cantila Data.",
    region: "Germany (FSN1, Falkenstein) / Finland (HEL1) / US (ASH)",
    phase: "Live",
  },
  {
    name: "Stripe Payments",
    purpose: "Payments processing, subscription billing, invoice generation, dunning.",
    region: "Ireland (EEA) / US",
    phase: "Live",
  },
  {
    name: "Cloudflare, Inc.",
    purpose: "Authoritative DNS for cantila.app and customer-delegated DNS zones.",
    region: "Global anycast",
    phase: "Live",
  },
  {
    name: "Tucows / OpenSRS",
    purpose: "Domain registrar backend for Cantila Domains.",
    region: "Canada / Global",
    phase: "Live",
  },
  {
    name: "Anthropic, PBC",
    purpose: "Claude API access for the Cantila Deploy assistant and Cantila Agents' brain (when the customer opts into Claude-backed analysis).",
    region: "US",
    phase: "Live",
  },
  {
    name: "Mailcow (self-hosted) + dedicated SMTP IPs",
    purpose: "Outbound and inbound mail delivery for Cantila Mail.",
    region: "Hetzner FSN1 — runs on Cantila infrastructure; no third-party email relay.",
    phase: "Phase 2",
  },
  {
    name: "Telnyx / Bandwidth (under evaluation)",
    purpose: "Carrier interconnect for Cantila SMS — SMS delivery, inbound routing, A2P/10DLC registration.",
    region: "US / Global",
    phase: "Phase 3",
  },
];

export default function SubprocessorsPage() {
  return (
    <LegalPage
      title="Subprocessors"
      effective="2026-05-28"
      intro={
        <>
          Cantila uses the third parties below to provide the service.
          Each handles a specific slice of customer data under written
          contractual terms (DPA, SCCs where applicable). Cantila
          notifies controllers at least 30 days before adding a new
          subprocessor — see <a href="/legal/dpa">DPA §5</a>.
        </>
      }
    >
      <div className="not-prose mt-6 overflow-hidden rounded-2xl border border-light-border bg-light-bg">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-light-surface font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
              <th className="px-4 py-3">Subprocessor</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.name}
                className={i % 2 === 0 ? "" : "bg-light-surface/40"}
              >
                <td className="px-4 py-3 font-semibold text-light-ink">
                  {row.name}
                </td>
                <td className="px-4 py-3 text-light-ink-dim">{row.purpose}</td>
                <td className="px-4 py-3 text-light-ink-dim">{row.region}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 font-mono text-2xs uppercase tracking-cantila-kv ${
                      row.phase === "Live"
                        ? "bg-live/10 text-live-dim"
                        : "bg-warn/10 text-warn"
                    }`}
                  >
                    {row.phase}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How to subscribe to changes</h2>
      <p>
        Email <a href="mailto:legal@cantila.app">legal@cantila.app</a>{" "}
        with the subject "subprocessor notice" and you'll be added to the
        notification list. Changes are also surfaced in the{" "}
        <a href="/changelog">changelog</a>.
      </p>
    </LegalPage>
  );
}
