import LegalPage from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Acceptable use policy · Cantila",
  description: "What you can and cannot do with Cantila.",
};

export default function AupPage() {
  return (
    <LegalPage
      title="Acceptable use policy"
      effective="2026-05-28"
      intro="This AUP describes what Cantila does not permit. Breaking these rules can get your account suspended or terminated."
    >
      <h2>1. The bright lines</h2>
      <p>You may not use Cantila to host, send, store, or distribute:</p>
      <ul>
        <li>Content that is illegal under applicable law.</li>
        <li>Child sexual abuse material (CSAM). Any reports are forwarded to NCMEC and law enforcement.</li>
        <li>Material that incites violence, terrorism, or genocide.</li>
        <li>Malware, ransomware, worms, exploit kits, or other harmful code intended to compromise other systems.</li>
        <li>Phishing pages, credential-harvesting kits, or fraudulent sites impersonating legitimate brands.</li>
        <li>Unsolicited bulk email, SMS, or voice calls — see also our Mail and SMS sending policies below.</li>
        <li>Material that infringes intellectual property rights you don't have a licence to use.</li>
        <li>Content that violates someone's privacy — doxing, non-consensual intimate imagery, unauthorised personal data.</li>
      </ul>

      <h2>2. No attacks on other systems</h2>
      <ul>
        <li>No DoS / DDoS launch infrastructure.</li>
        <li>No network scanning, port scanning, or vulnerability probing of systems you don't own.</li>
        <li>No brute-forcing, credential stuffing, or password spraying.</li>
        <li>No proxy / VPN / Tor exit infrastructure for the purpose of evading abuse controls.</li>
        <li>No cryptocurrency mining on the Hobby tier; on paid tiers, mining is allowed only if it doesn't degrade the fleet.</li>
      </ul>

      <h2>3. Email (Cantila Mail, when live)</h2>
      <ul>
        <li>You must own or have permission to send from any domain you send from.</li>
        <li>You must honor unsubscribe requests within 10 days.</li>
        <li>You may not send to lists you didn't collect yourself with opt-in consent.</li>
        <li>You must include a working physical mailing address per CAN-SPAM and CASL.</li>
        <li>Sustained bounce rate above 5% triggers automated throttling and a deliverability review.</li>
      </ul>

      <h2>4. SMS / voice (Cantila SMS, when live)</h2>
      <ul>
        <li>You must comply with TCPA, A2P 10DLC, and the campaign registration you submitted.</li>
        <li>STOP / START / HELP keywords must function (Cantila handles them by default — don't disable).</li>
        <li>No calls or texts to numbers on the national do-not-call registry without a valid existing relationship.</li>
      </ul>

      <h2>5. Resource use</h2>
      <ul>
        <li>Plan allowances are documented at <a href="/pricing">cantila.app/pricing</a>.</li>
        <li>Sustained 100% CPU usage at the plan ceiling without scaling up is a candidate for throttling.</li>
        <li>Don't intentionally degrade the shared fleet for other tenants. The Capacity agent watches.</li>
      </ul>

      <h2>6. Account integrity</h2>
      <ul>
        <li>One person, one account. Sub-accounts under an Agency plan are allowed; sock-puppet free-tier accounts are not.</li>
        <li>Don't resell Cantila to third parties without the Agency or Reseller plan.</li>
        <li>API keys are personal — don't share them across organisations.</li>
      </ul>

      <h2>7. Reporting abuse</h2>
      <p>
        See something hosted on Cantila that violates this AUP?{" "}
        <a href="mailto:abuse@cantila.app">abuse@cantila.app</a>. Include
        the URL and a description; Cantila investigates and responds.
      </p>

      <h2>8. Enforcement</h2>
      <p>
        We try to give notice and a cure period before suspension. Severe
        or repeated violations skip the cure period. Cantila reserves the
        right to remove offending content immediately when delay would
        cause harm.
      </p>
    </LegalPage>
  );
}
