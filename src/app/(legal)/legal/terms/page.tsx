import LegalPage from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Terms of service · Cantila",
  description: "The terms you agree to when you use Cantila.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      effective="2026-05-28"
      intro={
        <>
          These are the terms you agree to when you sign up for Cantila or
          use the Console, CLI, MCP server, or any other Cantila surface.
          Cantila is operated by JJ Cantila, sole proprietor.
        </>
      }
    >
      <h2>1. Your account</h2>
      <ul>
        <li>You must be 16 or older to use Cantila.</li>
        <li>You're responsible for keeping your password and API keys secret.</li>
        <li>You're responsible for everything done with your account or any sub-account you create.</li>
        <li>Tell us immediately at <a href="mailto:security@cantila.app">security@cantila.app</a> if you suspect a compromise.</li>
      </ul>

      <h2>2. The service</h2>
      <p>
        Cantila provides VPS-powered hosting and bundled services (database,
        domains, email, SMS) under the plan tiers and meter rates published
        at <a href="/pricing">cantila.app/pricing</a>. Mail and SMS are
        Phase 2 and Phase 3 respectively — until each ships, the meter is
        zero and delivery runs through Cantila's stub adapter.
      </p>
      <p>
        We aim for high availability but don't offer an explicit uptime SLA
        on Hobby, Starter, Pro, or Agency plans. Dedicated plans include
        a contractual SLA.
      </p>

      <h2>3. Acceptable use</h2>
      <p>
        Use of Cantila is governed by our{" "}
        <a href="/legal/aup">Acceptable Use Policy</a>. Highlights:
        no spam, no abuse, no malware distribution, no infringement, no
        running services intended to attack other systems.
      </p>

      <h2>4. Your content</h2>
      <p>
        Your code, data, projects, and any content you upload remain yours.
        You grant Cantila a narrow licence to host, route, and process it
        as required to provide the service. We don't claim ownership and
        we don't use your content to train models.
      </p>

      <h2>5. Fees and billing</h2>
      <ul>
        <li>Plan subscriptions bill monthly in advance through Stripe.</li>
        <li>Metered usage above the plan allowance bills in arrears on the next invoice.</li>
        <li>Spend caps and budget alerts default on; you set the ceiling.</li>
        <li>Failed payments follow Stripe's dunning chain: active → past_due → suspended → canceled.</li>
        <li>Domain registrations and renewals are non-refundable per registrar rules.</li>
      </ul>

      <h2>6. Suspension and termination</h2>
      <p>
        Cantila may suspend or terminate an account that violates these
        terms, the AUP, or applicable law. Where possible we'll give
        notice and a reasonable cure period. Severe violations (active
        attacks, illegal content, payment fraud) get immediate suspension.
      </p>
      <p>
        You may cancel at any time from{" "}
        <a href="https://console.cantila.app/billing">Console → Billing</a>.
        Cantila will not pro-rate refunds for partial months on
        cancellation; you keep service through the period you've paid for.
      </p>

      <h2>7. Data handling</h2>
      <p>
        See our <a href="/legal/privacy">Privacy Policy</a> and{" "}
        <a href="/legal/dpa">Data Processing Agreement</a>. Subprocessors
        are listed at <a href="/legal/subprocessors">cantila.app/legal/subprocessors</a>.
      </p>

      <h2>8. Warranty disclaimer</h2>
      <p>
        Cantila is provided "as is" and "as available". Beyond what's
        promised here and in any signed agreement, Cantila disclaims all
        warranties to the maximum extent allowed by law.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Cantila is not liable for
        any indirect, incidental, special, or consequential damages.
        Cantila's aggregate liability under these terms is capped at the
        greater of $100 USD or the amount you paid Cantila in the 12
        months preceding the claim.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the Philippines, where
        Cantila is registered. Disputes go to the courts of Manila.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        Material changes get an email to every account at least 30 days
        before they take effect. Continued use after the effective date
        means you accept the new terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        <a href="mailto:legal@cantila.app">legal@cantila.app</a>{" "}
        or <a href="mailto:founder@cantila.app">founder@cantila.app</a>.
      </p>
    </LegalPage>
  );
}
