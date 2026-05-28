import LegalPage from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Data processing agreement · Cantila",
  description: "The DPA between Cantila and customers under GDPR / UK GDPR.",
};

export default function DpaPage() {
  return (
    <LegalPage
      title="Data processing agreement"
      effective="2026-05-28"
      intro="This DPA forms part of the Cantila Terms of Service and governs Cantila's processing of personal data on behalf of customers (controllers) under GDPR, UK GDPR, and equivalent regimes."
    >
      <h2>1. Roles</h2>
      <ul>
        <li><strong>You</strong> are the <em>controller</em> — you decide why and how the personal data of your end users is processed.</li>
        <li><strong>Cantila</strong> is the <em>processor</em> — we process personal data only on your documented instructions.</li>
        <li>The plan tier you subscribe to, the configuration you set in the Console, and the operations you initiate through the API / CLI / MCP are your documented instructions.</li>
      </ul>

      <h2>2. Scope and duration</h2>
      <p>
        Cantila processes personal data only as long as needed to provide
        the service, plus a 30-day grace period after account deletion
        for accidental-deletion recovery. After that, data is purged
        from primary storage and backups age out within 30 days.
      </p>

      <h2>3. Categories of data and data subjects</h2>
      <ul>
        <li>Account holders — name, email, hashed password, OIDC subject.</li>
        <li>Billing contacts — name, billing address, last-4 of payment instrument.</li>
        <li>End users of customer applications — whatever the customer stores in their database, mailbox, or SMS history, plus traffic metadata (method, path, status, latency).</li>
      </ul>

      <h2>4. Security measures</h2>
      <ul>
        <li>TLS 1.2+ on every public endpoint.</li>
        <li>AES-256-GCM encryption at rest for secrets and environment variable values.</li>
        <li>Per-account envelope keys under a master <code>CANTILA_SECRET_KEY</code>.</li>
        <li>Per-key API scoping; bcrypt password hashing.</li>
        <li>Firewalled admin endpoints; immutable audit log of every mutation.</li>
        <li>Backups are encrypted, regional, and retained 30 days.</li>
      </ul>

      <h2>5. Subprocessors</h2>
      <p>
        Cantila uses a small set of subprocessors listed at{" "}
        <a href="/legal/subprocessors">cantila.app/legal/subprocessors</a>.
        Cantila notifies controllers at least 30 days before adding a
        new subprocessor that handles personal data. Controllers may
        object; if the objection isn't resolvable, the controller may
        terminate with pro-rated refund for the unused portion of any
        prepaid term.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Cantila's production region is Hetzner FSN1 (Germany). Transfers
        to Stripe (US) and other subprocessors outside the EEA are
        covered by Standard Contractual Clauses (2021/914 Module 3 where
        Cantila is processor and the subprocessor is sub-processor).
      </p>

      <h2>7. Data subject requests</h2>
      <p>
        Cantila will forward any data-subject request it receives to the
        relevant controller within 5 business days. Cantila supports the
        controller in fulfilling access, correction, deletion, and
        portability requests through the export and delete tooling in
        the Console.
      </p>

      <h2>8. Personal data breach notification</h2>
      <p>
        Cantila will notify controllers within 72 hours of becoming aware
        of a personal data breach affecting their data. The notification
        will include what we know about scope, impact, and remediation,
        and will be updated as the investigation progresses.
      </p>

      <h2>9. Audit rights</h2>
      <p>
        Controllers may request a summary of Cantila's security controls
        once per 12-month period; for deeper review (penetration test
        reports, SOC 2 once Cantila achieves it), Cantila will provide
        them under NDA on reasonable request.
      </p>

      <h2>10. Liability and termination</h2>
      <p>
        Liability under this DPA is subject to the limitations in the
        Terms of Service. Either party may terminate this DPA on the
        same notice as the Terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Data Protection Officer:{" "}
        <a href="mailto:dpo@cantila.app">dpo@cantila.app</a>.
      </p>

      <p className="!mt-10 text-2xs text-light-ink-faint">
        Cantila will sign a counter-signed copy of this DPA on request to{" "}
        <a href="mailto:legal@cantila.app">legal@cantila.app</a>.
      </p>
    </LegalPage>
  );
}
