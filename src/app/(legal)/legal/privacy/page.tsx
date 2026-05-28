import LegalPage from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Privacy policy · Cantila",
  description:
    "What Cantila collects, why, where it lives, and what your rights are.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      effective="2026-05-28"
      intro="Cantila is operated by JJ Cantila, sole proprietor. This policy describes what Cantila collects, why, where it lives, and your rights over it. Written plainly — no dark patterns and no buried opt-outs."
    >
      <h2>1. The short version</h2>
      <ul>
        <li>We collect what we need to provide the service and bill for it. Nothing else.</li>
        <li>We do not sell personal data. We have never sold personal data. We never will.</li>
        <li>You can export your data and delete your account from the Console at any time.</li>
        <li>Subprocessors are listed at <a href="/legal/subprocessors">cantila.app/legal/subprocessors</a>.</li>
      </ul>

      <h2>2. What we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Email address (required).</li>
        <li>Name (optional).</li>
        <li>Password hash (we never see your password in clear; bcrypt).</li>
        <li>OIDC subject + claims (if you sign in with SSO).</li>
      </ul>

      <h3>Billing information</h3>
      <ul>
        <li>Stripe customer id, subscription id, billing address.</li>
        <li>The last 4 digits of your card — never the full PAN; that lives at Stripe.</li>
      </ul>

      <h3>Operational data</h3>
      <ul>
        <li>Projects, deploys, environment variable <em>names</em> (values are encrypted at rest with AES-256-GCM under <code>CANTILA_SECRET_KEY</code>).</li>
        <li>Build and runtime logs (retained 30 days for Hobby, 90 for paid).</li>
        <li>Agent action journal — observations, actions, outcomes, verifiers.</li>
        <li>Activity log — every mutation, system or human, with the source key fingerprint.</li>
      </ul>

      <h3>Traffic to your apps</h3>
      <p>
        Cantila Host proxies traffic to your projects. We log request
        metadata (method, path, status, latency, bytes) for 7 days for
        debugging and abuse prevention. We do not retain request bodies
        and we do not inspect TLS payloads.
      </p>

      <h2>3. What we do with it</h2>
      <ul>
        <li>Operate the service — deploys, scaling, routing, billing.</li>
        <li>Detect and respond to abuse (security agent, audit log).</li>
        <li>Email transactional notices (deploy succeeded / failed, invoice paid / failed, security alerts).</li>
        <li>Improve the product based on aggregate, de-identified usage signals.</li>
      </ul>
      <p>
        We do not run third-party advertising or analytics on the Cantila
        Console.
      </p>

      <h2>4. Where it lives</h2>
      <p>
        Primary production region: Hetzner FSN1 (Falkenstein, Germany).
        Database backups are encrypted and stored in the same region.
        Stripe processes payments globally per their data residency
        commitments.
      </p>

      <h2>5. Who else touches it</h2>
      <p>
        Cantila uses a small set of subprocessors — Hetzner (compute),
        Stripe (billing), Cloudflare (DNS), OpenSRS (domain reseller),
        and — when their respective Phases ship — Mailcow and Telnyx /
        Bandwidth. The full list with purpose and region is at{" "}
        <a href="/legal/subprocessors">cantila.app/legal/subprocessors</a>.
      </p>

      <h2>6. Your rights</h2>
      <ul>
        <li><strong>Access.</strong> Export your account data from <a href="https://console.cantila.app/settings">Settings → Export</a>.</li>
        <li><strong>Correction.</strong> Edit any field that's editable in the Console.</li>
        <li><strong>Deletion.</strong> Delete your account from Settings; we purge inside 30 days.</li>
        <li><strong>Portability.</strong> Exports include JSON for accounts, projects, and configurations, and SQL dumps for managed databases.</li>
        <li><strong>Objection.</strong> Email <a href="mailto:privacy@cantila.app">privacy@cantila.app</a>.</li>
      </ul>
      <p>
        GDPR, UK GDPR and CCPA apply where they apply. You don't need to
        cite the statute — just ask.
      </p>

      <h2>7. Retention</h2>
      <ul>
        <li>Account: while the account is open + 30 days after closure.</li>
        <li>Billing records: 7 years (legal requirement).</li>
        <li>Logs: 7–90 days depending on plan and category.</li>
        <li>Backups: 30 days rolling.</li>
      </ul>

      <h2>8. Security</h2>
      <ul>
        <li>TLS 1.2+ on every public endpoint.</li>
        <li>Secrets encrypted at rest with AES-256-GCM under per-account envelope keys.</li>
        <li>Per-key API scopes; the Security agent watches for auth anomalies.</li>
        <li>SSH and admin endpoints firewalled to the founder's residential IP.</li>
      </ul>
      <p>
        Vulnerability reports: <a href="mailto:security@cantila.app">security@cantila.app</a>.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        Material changes get an email to every account at least 30 days
        before they take effect. Non-material edits (typos, link fixes)
        ship without notice; check the effective date at the top.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href="mailto:privacy@cantila.app">privacy@cantila.app</a>{" "}
        or — for anything urgent — <a href="mailto:founder@cantila.app">founder@cantila.app</a>.
      </p>
    </LegalPage>
  );
}
