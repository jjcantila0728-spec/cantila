import HeroDarkBand from "@/components/marketing/HeroDarkBand";
import {
  CtaBand,
  PrimaryCta,
  SecondaryCta,
  Section,
} from "@/components/marketing/ui";

export const metadata = {
  title: "About · Cantila",
  description:
    "Cantila is a one-person company building the deploy layer the AI build wave needs — VPS-powered, bundled services, one chat.",
};

export default function AboutPage() {
  return (
    <>
      <HeroDarkBand
        eyebrow="About"
        title={
          <>
            Cantila collapses the last mile of shipping software —{" "}
            <span className="text-ember">into one chat.</span>
          </>
        }
        description="Cantila is built by JJ Cantila, solo, in public, on Hetzner and Coolify and Stripe. The product is the plan and the plan is the product."
        actions={
          <>
            <PrimaryCta href="/signup">Start free</PrimaryCta>
            <SecondaryCta href="/contact" tone="dark">
              Get in touch
            </SecondaryCta>
          </>
        }
        tone="compact"
      />

      <Section eyebrow="Thesis" title="AI generates working software faster than the deploy layer can absorb it.">
        <div className="prose-marketing space-y-4 text-light-ink-dim">
          <p>
            Shipping software has never been easier to start and never been
            more annoying to finish. A builder can generate a working app in
            an afternoon. Going live still means assembling a frontend host,
            a separate database provider, a third for email, a fourth for
            SMS, a registrar, and — for anything that needs to run
            continuously, like an AI agent — a raw VPS they have to
            configure and secure themselves.
          </p>
          <p>
            Cantila is the layer that already has all of it connected.
            Register a domain in Cantila and its DNS, SSL, and email
            authentication records are configured automatically. Deploy an
            app and a database is one sentence away. Need to send a
            verification code? The SMS API is in your account. The platform's
            job is to make "live on the internet, properly wired up" a single
            conversational step.
          </p>
        </div>
      </Section>

      <Section eyebrow="What we believe" title="Five things in our voice." bg="paper">
        <ol className="divide-y divide-light-border-soft rounded-2xl border border-light-border bg-light-bg">
          {[
            {
              t: "Ship-language, not engineer-language.",
              d: "\"Ship\", \"live\", \"wired in\" do the work. \"Provision\", \"orchestrate\", \"integrate\" sound like a whiteboard.",
            },
            {
              t: "Specific over abstract.",
              d: "Name the thing. \"Postgres, ready in the env\" beats \"managed database services\".",
            },
            {
              t: "No marketing hedges.",
              d: "If something is fast, say \"in 3 minutes\". If something is powerful, name what it does.",
            },
            {
              t: "Honest about the seams.",
              d: "Phase 1 is hosting and domains. Mail is Phase 2. SMS is Phase 3. We say so out loud.",
            },
            {
              t: "One sentence at a time.",
              d: "Short. Two clauses max. A run-on packed with three ideas reads as marketing.",
            },
          ].map((row, i) => (
            <li key={row.t} className="flex gap-4 p-5">
              <span className="font-mono text-ember-on-light">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-display text-base font-semibold text-light-ink">
                  {row.t}
                </p>
                <p className="mt-1 text-sm text-light-ink-dim">{row.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Who's building" title="Solo founder, public roadmap.">
        <p className="max-w-2xl text-light-ink-dim">
          Cantila is run by{" "}
          <span className="text-light-ink">JJ Cantila</span> as a one-person
          company. The complete product and build plan
          (<span className="font-mono text-light-ink">Cantila_Complete_Plan.md</span>)
          lives in the repo and is updated every time a piece lands. There is
          no investor deck behind the GitHub release. What ships is what's
          shipped — see the{" "}
          <a className="text-ember-on-light hover:underline" href="/changelog">
            changelog
          </a>
          .
        </p>
      </Section>

      <CtaBand
        title="Build with Cantila."
        primary={{ href: "/signup", label: "Start free" }}
        secondary={{ href: "/docs", label: "Read the docs" }}
      />
    </>
  );
}
