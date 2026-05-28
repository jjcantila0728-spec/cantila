# Cantila Console

The unified control surface for the **Cantila** hosting cloud — the dashboard
where builders deploy and operate sites, apps, and AI agents from one chat,
with the domain, database, email and SMS already wired in.

This repository is the **Phase 1 MVP prototype of the Console** (the web
dashboard described in §4.8 of `Cantila_Complete_Plan.md`). It is a fully
interactive front end running on realistic **mock data** — no backend, no
network calls. It exists to validate the product UX and brief co-founders,
early engineers, or investors.

---

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. The root path redirects to the Console
dashboard. A standalone `/login` screen is also included.

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

Requires Node.js 18.17+.

---

## Tech stack

Matches the stack recommended in the plan (§7.7):

| Layer        | Choice                          |
| ------------ | ------------------------------- |
| Framework    | Next.js 14 (App Router)         |
| Language     | TypeScript                      |
| Styling      | Tailwind CSS 3                  |
| Icons        | lucide-react                    |
| Charts       | Hand-rolled SVG (no chart lib)  |
| Fonts        | Clash Display · Switzer · JetBrains Mono |

No other runtime dependencies — charts, gauges and the log stream are all
built in-house to keep the bundle lean.

---

## Project structure

```
src/
  app/
    layout.tsx              Root layout (fonts, metadata)
    page.tsx                Redirects → /dashboard
    globals.css             Theme tokens, grain, animations
    not-found.tsx           404 screen
    login/                  Standalone sign-in screen
    (console)/              Route group — everything inside the Console shell
      layout.tsx            Sidebar + Topbar + content frame
      dashboard/            Workspace overview
      projects/             Project list + detail ([id], 7 tabs)
      deploy/               Chat Deploy — the signature feature
      monitoring/           Observability — uptime, alerts, incidents
      databases/            Cantila Data — databases + object storage
      domains/              Cantila Domains
      mail/                 Cantila Mail · [box] webmail client
      sms/                  Cantila SMS · [number] conversation threads
      templates/            Template marketplace
      billing/              Plans, metered usage, invoices
      team/                 Members & roles
      settings/             Account + the Claude / MCP bridge
  components/
    Sidebar.tsx  Topbar.tsx        App shell (client)
    ui.tsx                         Shared primitives (server-safe)
    Modal.tsx                      Dialog + form-field chrome (client)
    AreaChart.tsx                  SVG charts, sparklines, gauges
    DeployList.tsx                 Deployment rows
    ProjectView.tsx                Project detail w/ tabbed UI (client)
    LogStream.tsx                  Simulated live log streaming (client)
    ChatDeploy.tsx                 The Chat Deploy agent simulation (client)
    MonitoringView.tsx             Observability — uptime, alerts, status (client)
    MailView.tsx                   Cantila Mail section (client)
    MailboxView.tsx                Webmail client — folders, reading pane (client)
    SmsView.tsx                    Cantila SMS section (client)
    ConversationsView.tsx          SMS conversation threads (client)
    CopyButton.tsx                 Copy-to-clipboard helper (client)
  lib/
    types.ts                       Domain types
    mock-data.ts                   Deterministic fixtures
```

---

## What's in the prototype

- **Dashboard** — live-project stats, aggregate traffic chart, recent
  deployments, an activity feed, and a data-plane (fleet) snapshot.
- **Projects** — a card grid, plus a detail view with seven working tabs:
  Overview, Deployments, Logs, Metrics, Environment, Domains, Settings.
- **Chat Deploy** — an interactive simulation of Cantila's signature loop:
  describe an app (or attach files), and watch it detect the stack, provision
  a database, build, schedule, route, issue SSL, and return a live URL — each
  step shown as a concrete, reversible operation.
- **Logs** — a simulated live-streaming log viewer with pause / clear.
- **Monitoring** — cross-project observability: a public status page, uptime
  monitors with check-history bars, an active-alerts feed with acknowledge,
  and incident timelines.
- **Cantila Data** — managed databases (PostgreSQL, MySQL, MongoDB, Redis)
  and S3-compatible object-storage buckets with CDN — each with a create flow.
- **Cantila Domains / Templates** — registrar + DNS, and the one-click
  template marketplace.
- **Cantila Mail** — a full send-and-receive email provider, presented as
  first-party infrastructure (no third-party relay): sending domains with
  SPF/DKIM/DMARC/MX status, hosted mailboxes with storage quotas, aliases and
  email-to-app routing, an outbound-volume chart, and a live delivery feed.
  Open any mailbox for a working **webmail client** — folder rail, message
  list, reading pane, star/read state and a compose dialog.
- **Cantila SMS** — first-party messaging infrastructure: provisioned phone
  numbers with capabilities, the OTP/2FA verification API, an outbound-volume
  chart, and a recent-message log. Open any number for **conversation
  threads** — a two-pane messaging UI with chat bubbles and a live composer.
- **Billing** — plan tiers, metered-usage meters, invoices.
- **Settings** — the **Cantila + Claude bridge**: the MCP server endpoint
  with its exposed tools, and the connected claude.ai account.

## What is mocked

Most stateful sections still render from `src/lib/mock-data.ts` (metrics,
mail, sms, monitoring, billing). Metrics use a seeded RNG so the server and
client always render identically.

**Chat Deploy is wired to the live control plane** when the control plane
is reachable (see below) — the empty state shows a "Live mode" badge and
the deploy actually calls the Fastify API behind the Console proxy. When
the control plane is offline the existing scripted simulation is used.

## Connecting to the control plane

The Console proxies `/api/cantila/*` to the Cantila control plane through
`src/app/api/cantila/[...path]/route.ts`. The typed client lives in
`src/lib/api.ts`. To run both sides locally:

```bash
# terminal 1 — control plane
cd ../cantila-control-plane
npm install
cp .env.example .env
npm run dev                # listens on :8080

# terminal 2 — Console
cd ../cantila-console
cp .env.local.example .env.local   # CANTILA_CONTROL_PLANE_URL=http://localhost:8080
npm run dev                # listens on :3000
```

Open <http://localhost:3000/deploy> and the Chat Deploy badge will read
**Live mode — connected to the Cantila control plane**.

## Turning this into the real Console

The intended next steps, in plan order:

1. Migrate the remaining mock-backed views (Projects, Domains, Databases,
   Mail, SMS, Monitoring) onto `src/lib/api.ts`.
2. Add authentication and gate `/` behind a real session check.
3. Stream real build logs over SSE/WebSocket into `LogStream`.
4. Back the MCP panel in Settings with the live OAuth connection state.

---

*Cantila Console · MVP prototype · v0.2 · May 2026*
