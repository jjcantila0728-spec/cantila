/* ============================================================
   Per-product marketing copy for /products/[slug].

   Each entry maps to a Cantila X product in src/lib/site-meta.ts
   PRODUCTS. The slug is the URL; the rest is what ProductSurface
   renders. Copy follows brand/voice.md — name the thing, no
   marketing hedges, honest about the seams.
   ============================================================ */

import type { ReactNode } from "react";
import {
  Boxes,
  Sparkles,
  Database,
  Globe,
  Brain,
  Workflow,
  Inbox,
  Phone,
  Cpu,
  Layers,
  Code,
  Wifi,
  ShieldCheck,
  GitBranch,
  Terminal,
  KeyRound,
  Container,
  ListTree,
  Hash,
  Activity,
  Mail,
  PhoneCall,
  Mic,
  Search,
  PackageOpen,
  Lock,
  Cog,
  Eye,
  Heart,
  ScanLine,
  Webhook,
} from "lucide-react";
import type { DetailRow } from "@/components/marketing/ProductSurface";

export type ProductCopy = {
  hero: {
    title: ReactNode;
    description: ReactNode;
    primary?: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
  features: {
    title: string;
    description: ReactNode;
    icon: ReactNode;
  }[];
  details?: DetailRow[];
  cta?: {
    title: ReactNode;
    description?: ReactNode;
    primary: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
};

const I = (Icon: typeof Boxes) => <Icon className="h-4 w-4" strokeWidth={1.8} />;

export const PRODUCT_COPY: Record<string, ProductCopy> = {
  host: {
    hero: {
      title: (
        <>
          Real servers, behind <span className="text-ember">one chat.</span>
        </>
      ),
      description:
        "Cantila Host runs websites, full-stack apps, APIs, workers, and AI agents on a managed fleet of VPS nodes. Persistent processes. Root-level control. Every modern stack.",
    },
    features: [
      {
        title: "Universal runtimes",
        description:
          "Static sites, Node, Python, PHP, Ruby, Go, Java, .NET, Rust, Deno, Bun. Detected automatically — or set with a Dockerfile.",
        icon: I(Code),
      },
      {
        title: "Persistent compute",
        description:
          "Run things that never sleep — n8n, Flowise, OpenClaw, LibreChat, background workers, mobile backends.",
        icon: I(Cpu),
      },
      {
        title: "Every app type",
        description:
          "Websites, full-stack apps, REST and GraphQL APIs, scheduled jobs, AI agents — all on the same fleet.",
        icon: I(Layers),
      },
      {
        title: "Sleep / wake",
        description:
          "Idle Hobby apps sleep and wake on demand. Production workloads pin always-on with one flag.",
        icon: I(Wifi),
      },
      {
        title: "Auto-wired services",
        description:
          "Every project ships with a private Postgres, a mailbox, and an SMS number wired into the env before first build.",
        icon: I(ShieldCheck),
      },
      {
        title: "Git or files",
        description:
          "Push to deploy. Drop a zip in chat. Or let Chat Deploy generate the project from a description.",
        icon: I(GitBranch),
      },
    ],
  },

  deploy: {
    hero: {
      title: (
        <>
          Drop files in. Cantila detects the stack.{" "}
          <span className="text-ember">You get a URL.</span>
        </>
      ),
      description:
        "Cantila Deploy is the conversational front door — a single chat that turns intent or files into a running deployment, with the database, domain, mailbox and SMS number already attached.",
    },
    features: [
      {
        title: "Two ways in",
        description:
          "Drop a zip, link a repo, or describe what you want built and hosted. Cantila figures out the rest.",
        icon: I(Sparkles),
      },
      {
        title: "Automatic stack detection",
        description:
          "Build config, env-var inference, dependency install — all derived from the project, no .yaml to author.",
        icon: I(Cpu),
      },
      {
        title: "Conversational iteration",
        description:
          '"Switch it to Postgres", "add my custom domain", "why is it crashing?" — all handled in the same thread.',
        icon: I(Terminal),
      },
      {
        title: "Full transparency",
        description:
          "Every action the chat agent takes shows up as a concrete, reversible operation in the dashboard.",
        icon: I(Eye),
      },
      {
        title: "Bundled by default",
        description:
          "Every project lands with its own dedicated DB, mailbox, and SMS number — provisioned together, torn down together.",
        icon: I(PackageOpen),
      },
      {
        title: "From Claude, too",
        description:
          "Through the Cantila MCP server, every Claude surface gets cantila_deploy as a native capability.",
        icon: I(GitBranch),
      },
    ],
  },

  data: {
    hero: {
      title: (
        <>
          Managed databases. <span className="text-ember">In the env.</span>
        </>
      ),
      description:
        "Cantila Data is one-click managed Postgres, MySQL, Mongo and Redis with per-project credentials and private networking to the app. S3-compatible object storage. Daily backups, point-in-time restore, branching.",
    },
    features: [
      {
        title: "Postgres / MySQL / Mongo / Redis",
        description:
          "Pick the engine; the connection string appears in the project env on the next build.",
        icon: I(Database),
      },
      {
        title: "Per-project, private",
        description:
          "Each project gets its own credentials and private network path — no shared instance, no public endpoint.",
        icon: I(Lock),
      },
      {
        title: "Daily backups + PITR",
        description:
          "Automated snapshots and point-in-time restore back to any second in the retention window.",
        icon: I(ShieldCheck),
      },
      {
        title: "Database branching",
        description:
          "Spin a writable branch off the current state for staging or a preview environment — same shape as Neon / Planetscale.",
        icon: I(GitBranch),
      },
      {
        title: "Object storage + CDN",
        description:
          "S3-compatible bucket per project. Optional CDN for assets and uploads.",
        icon: I(Container),
      },
      {
        title: "One bill",
        description:
          "GB-month metered on the same invoice as hosting, domains, and the plan subscription.",
        icon: I(ListTree),
      },
    ],
  },

  domains: {
    hero: {
      title: (
        <>
          Register a domain. <span className="text-ember">Auto-wire everything.</span>
        </>
      ),
      description:
        "Cantila Domains is a registrar at near-wholesale pricing. WHOIS privacy free. Auto-renew on. Buy a domain inside a project and its DNS, SSL, and email authentication records configure themselves.",
      primary: { href: "/pricing#domains", label: "See domain prices" },
    },
    features: [
      {
        title: "16 TLDs at launch",
        description:
          ".xyz from $1.99. .com at $8.99. .ai at $49.99. The full catalog is on the pricing page.",
        icon: I(Globe),
      },
      {
        title: "Full DNS management",
        description:
          "A/AAAA/CNAME/MX/TXT/SRV/CAA records — edit in Console or set defaults that auto-apply.",
        icon: I(ListTree),
      },
      {
        title: "Auto-wired SSL + email",
        description:
          "DNS pointing at your app, SSL issued, SPF/DKIM/DMARC records for Cantila Mail — all done on registration.",
        icon: I(ShieldCheck),
      },
      {
        title: "Buy inside a project",
        description:
          "Add a domain from Project → Domains and it attaches and auto-wires in one step.",
        icon: I(Boxes),
      },
      {
        title: "Transfer in / out",
        description:
          "Authoritative transfers, EPP codes, no exit fees. Move in or out — your domain, your call.",
        icon: I(GitBranch),
      },
      {
        title: "Backed by OpenSRS",
        description:
          "Industry-standard ICANN-accredited reseller backend. The wholesale price is the actual wholesale price.",
        icon: I(KeyRound),
      },
    ],
  },

  agents: {
    hero: {
      title: (
        <>
          An operations brain that <span className="text-ember">watches the fleet.</span>
        </>
      ),
      description:
        "Cantila Agents is one shared brain plus a swarm of specialised agents. Crashed projects auto-roll back. Idle always-on apps right-size. Capacity pre-warms ahead of saturation. Every action lands in the activity log alongside the human ones.",
    },
    features: [
      {
        title: "Uptime",
        description:
          "Watches projects in crashed state. Auto-rolls back to the last live deployment within 30s. Verified after.",
        icon: I(Heart),
      },
      {
        title: "Deploy",
        description:
          "Surfaces a troubleshooting suggestion on failure. Offers rollback in chat.",
        icon: I(Activity),
      },
      {
        title: "Cost",
        description:
          "Recommends right-sizes on idle always-on apps; auto-applies low-risk drops with consent.",
        icon: I(ListTree),
      },
      {
        title: "Security",
        description:
          "Watches auth failures and unauthorised mutations. Locks compromised keys. Flags abuse.",
        icon: I(ShieldCheck),
      },
      {
        title: "Capacity",
        description:
          "Pre-warms additional nodes ahead of saturation across the Hetzner fleet.",
        icon: I(Cpu),
      },
      {
        title: "Mail / SMS",
        description:
          "Watches bounce rate and delivery failure spikes. Rotates IPs, throttles, opens an incident.",
        icon: I(Inbox),
      },
    ],
    details: [
      {
        eyebrow: "Learning loop",
        title: "Bias toward actions that worked.",
        description: (
          <>
            Every action carries an outcome and a verifier. The brain tracks{" "}
            <span className="font-mono">{`{ observation → action → outcome }`}</span>{" "}
            triples and downgrades the effective confidence of any action
            kind whose recent track record is bad. Heuristic today; same
            shape fits a fine-tuned model tomorrow.
          </>
        ),
        bullets: [
          "Verified after — auto-applied actions schedule a verify closure",
          "ok / pending / failed surfaces in the Console as a pill per row",
          "Kill switch: cantila agents pause",
        ],
      },
    ],
  },

  automations: {
    hero: {
      title: (
        <>
          n8n and OpenClaw —{" "}
          <span className="text-ember">native, one builder, one login.</span>
        </>
      ),
      description:
        "Cantila Automations bundles n8n and OpenClaw as first-class Cantila resources. The vendor engines run underneath as managed containers; the canvas, node palette, credential UI, and run feed all live inside the Console.",
    },
    features: [
      {
        title: "Multi-instance",
        description:
          "Many n8n or OpenClaw instances side-by-side — one per team, project, or environment.",
        icon: I(Workflow),
      },
      {
        title: "Native canvas",
        description:
          "A React-Flow editor in Cantila chrome. Drag from the palette, configure in a side rail, save.",
        icon: I(Layers),
      },
      {
        title: "One palette per engine",
        description:
          "Sourced from each engine's catalog and normalised — n8n's 400+ nodes, OpenClaw's tool surface.",
        icon: I(ListTree),
      },
      {
        title: "Trigger + run + replay",
        description:
          "Webhook, schedule, manual. Live SSE run feed per node. Every run replayable.",
        icon: I(Activity),
      },
      {
        title: "Connections built in",
        description:
          "Workflow nodes reference a connectionId — credentials live in Cantila's secrets manager, injected just-in-time.",
        icon: I(Cog),
      },
      {
        title: "Engine-agnostic adapter",
        description:
          "Adding a new engine kind later is one adapter, no Console code. Same port shape as Stripe / Telephony.",
        icon: I(Container),
      },
    ],
  },

  mail: {
    hero: {
      title: (
        <>
          A full email provider —{" "}
          <span className="text-ember">first-party, end to end.</span>
        </>
      ),
      description:
        "Cantila Mail sends and receives email for any domain in the account. Mailboxes, IMAP/POP3/SMTP, webmail, inbound parsing, deliverability — no third-party relay anywhere in the path.",
    },
    features: [
      {
        title: "Send",
        description:
          "Transactional API, per-project SMTP relay, templates with variables, scheduled sends, suppression lists.",
        icon: I(Mail),
      },
      {
        title: "Receive",
        description:
          "Inbound MX wired automatically. Hosted mailboxes with folders, search, per-box quotas.",
        icon: I(Inbox),
      },
      {
        title: "IMAP / POP3 / SMTP",
        description:
          "Standard protocols — Outlook, Apple Mail, Thunderbird, Gmail app, anything that speaks IMAP.",
        icon: I(Webhook),
      },
      {
        title: "Webmail",
        description:
          "A built-in browser client at /mail/[box] for zero-setup access from anywhere.",
        icon: I(Search),
      },
      {
        title: "Email-to-app",
        description:
          "Route an incoming message to a hosted app via webhook. Apps receive and act on email, not only send it.",
        icon: I(Workflow),
      },
      {
        title: "Deliverability",
        description:
          "SPF/DKIM/DMARC auto-configured. Dedicated IP pools, warmup, inbound spam + virus filtering.",
        icon: I(ShieldCheck),
      },
    ],
    cta: {
      title: <>Mail lands in Phase 2. <span className="text-ember">Get in line.</span></>,
      description:
        "The MailProvider port is live and the Mailcow MTA is queued — we're warming the dedicated IPs and rDNS before flipping the production switch. Sign up now and you'll be on day-one of live delivery.",
      primary: { href: "/signup", label: "Reserve your address" },
      secondary: { href: "/changelog", label: "Track progress" },
    },
  },

  sms: {
    hero: {
      title: (
        <>
          SMS and voice from{" "}
          <span className="text-ember">numbers you own.</span>
        </>
      ),
      description:
        "Cantila SMS is a complete telephony provider — outbound SMS and voice, inbound webhooks, a number marketplace, OTP engine, A2P/10DLC carrier registration. Run product OTPs and company two-way texting from the same place.",
    },
    features: [
      {
        title: "Outbound SMS",
        description:
          "API, bulk sends, scheduled delivery, templates, delivery receipts, status webhooks.",
        icon: I(Mail),
      },
      {
        title: "Inbound SMS",
        description:
          "Provisioned numbers accept inbound texts. Webhook to the app. Two-way conversations threaded together.",
        icon: I(Inbox),
      },
      {
        title: "OTP engine",
        description:
          "Code generation, delivery, expiry, rate-limit — first-class, not a side effect of the send API.",
        icon: I(Hash),
      },
      {
        title: "Voice",
        description:
          "Outbound calls, inbound calls with routing, voicemail with transcription, programmable IVR.",
        icon: I(PhoneCall),
      },
      {
        title: "Number marketplace",
        description:
          "Browse by country, area code, type, capability. Per-number setup + monthly lease, billed on the same invoice.",
        icon: I(Search),
      },
      {
        title: "Carrier + compliance",
        description:
          "10DLC / A2P brand and campaign registration, toll-free verification — handled at provisioning.",
        icon: I(Mic),
      },
    ],
    cta: {
      title: <>SMS lands in Phase 3. <span className="text-ember">Reserve a number.</span></>,
      description:
        "TelephonyProvider port is live; inbound webhooks parse through it. Live carrier delivery arrives once Telnyx onboarding finishes.",
      primary: { href: "/signup", label: "Get notified" },
      secondary: { href: "/changelog", label: "Track progress" },
    },
  },
};
