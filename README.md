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
      databases/            Cantila Data
      domains/              Cantila Domains
      templates/            Template marketplace
      billing/              Plans, metered usage, invoices
      team/                 Members & roles
      settings/             Account + the Claude / MCP bridge
  components/
    Sidebar.tsx  Topbar.tsx        App shell (client)
    ui.tsx                         Shared primitives (server-safe)
    AreaChart.tsx                  SVG charts, sparklines, gauges
    DeployList.tsx                 Deployment rows
    ProjectView.tsx                Project detail w/ tabbed UI (client)
    LogStream.tsx                  Simulated live log streaming (client)
    ChatDeploy.tsx                 The Chat Deploy agent simulation (client)
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
- **Cantila Data / Domains / Templates** — the bundled services.
- **Billing** — plan tiers, metered-usage meters, invoices.
- **Settings** — the **Cantila + Claude bridge**: the MCP server endpoint
  with its exposed tools, and the connected claude.ai account.

## What is mocked

Everything stateful. All data lives in `src/lib/mock-data.ts` (deployments,
metrics, logs, databases, etc.). Metrics use a seeded RNG so the server and
client always render identically. Buttons that would mutate real
infrastructure (Redeploy, Add domain, Invite member…) are present but inert.

## Turning this into the real Console

The intended next steps, in plan order:

1. Replace `src/lib/mock-data.ts` with a typed client for the Cantila API
   server (§7.1). `src/lib/types.ts` is the contract to build against.
2. Add authentication and gate `/` behind a real session check.
3. Wire the Chat Deploy UI to the Chat Deploy service; stream real build
   logs over SSE/WebSocket into `LogStream`.
4. Back the MCP panel in Settings with the live OAuth connection state.

---

*Cantila Console · MVP prototype · v0.1 · May 2026*
