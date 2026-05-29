# Cantila Docs Build-out — Design Spec

**Date:** 2026-05-28
**Status:** Approved structure; pending spec review before implementation.
**Goal:** Expand the public docs at `cantila.app/docs` from 8 pages to a complete,
professional documentation site (Stripe/Vercel/Supabase calibre) covering the whole
product — grounded entirely in the real codebase, with honest availability badges on
features that are not yet fully live.

Also fixed (already done): the Console Topbar "Docs" link pointed at the dead
`https://docs.cantila.app`; it now links to `/docs` (resolves in dev; middleware routes
console→apex in prod).

---

## 1. Accuracy sources (every page must cite real behaviour)

| Surface | Source of truth |
|---|---|
| Product catalog & positioning | `Cantila_Complete_Plan.md` §4 (Service Catalog), §2 (Vision) |
| Phase model / what's deferred | Plan §6 (Three Phases), §6.4 (out of MVP) |
| What actually ships today | Plan §15.1; what's mocked → §15.2 |
| Platform REST API (~134 routes) | `cantila-control-plane/src/index.ts` + `src/{cantilapay,automations,connections}/routes.ts` |
| MCP tools | Plan §4.3 table |
| CLI commands | `cantila-cli/src/index.ts` (command map), `src/config.ts`, `src/api.ts` |
| Cantilapay Node SDK | `cantilapay-sdk-node/src/**` (resources, types, errors, webhooks) |
| Console area behaviour/maturity | `cantila-console/src/app/(console)/**`, `src/lib/mock-data` vs `src/lib/api` |

**Hard rule:** document only what the code/plan supports. Where a feature is staged or
stubbed (Mail MTA, SMS/Voice, OAuth connections), state it plainly with a phase badge.
Mark genuine uncertainty rather than inventing.

## 2. Availability badging

Add an MDX `<Badge>` component for honest, consistent availability tags. Tones:

- `live` (green) — shippable today
- `phase-2` (amber) — building now / partial (Mail send live, MTA pending; Automations Phase A)
- `phase-3` (blue/info) — planned (SMS, Voice, Numbers, A2P)
- `beta` (violet) — live but rough

Usage in MDX: a short callout at the top of a page, e.g.
`<Badge tone="phase-2">Phase 2 — sending is live; the MTA is being built</Badge>`.
For partial features, pair the badge with a `<Callout tone="warn">` explaining exactly
what works today vs. what's pending (mirroring plan §15.2 language).

## 3. Information architecture (drives `src/data/docs-nav.ts`)

Eight sidebar groups. `(exists)` = current MDX page kept and revised for accuracy.

**Get started**
- `/docs` — Overview (index page, revised) *(exists, page.tsx)*
- `/docs/getting-started` — Quickstart: account → first live deploy *(exists; keep this slug to avoid breaking marketing CTAs, retitle nav label to "Quickstart")*
- `/docs/concepts` — Core concepts: control plane, data plane, projects, deployments, auto-wired services, the phase model

**Deploy**
- `/docs/deploy/chat` — Chat Deploy *(exists)*
- `/docs/deploy/git` — Git push-to-deploy *(exists)*
- `/docs/deploy/upload` — File & zip upload
- `/docs/deploy/builds` — Builds & runtimes (Nixpacks + Dockerfile; supported languages)
- `/docs/deploy/env` — Environment variables & secrets
- `/docs/deploy/rollbacks` — Deployments & instant rollback
- `/docs/deploy/scaling` — Scaling, instances, sleep/wake
- `/docs/deploy/logs` — Logs & metrics
- `/docs/deploy/backups` — Backups & restore
- `/docs/deploy/previews` — Preview environments

**Platform services**
- `/docs/databases` — Databases & object storage (Cantila Data)
- `/docs/domains` — Domains: registrar, DNS, auto-wiring
- `/docs/mail` — Mail: sending, mailboxes, webmail, inbound `phase-2`
- `/docs/sms` — SMS, Voice & Numbers; A2P/10DLC `phase-3`
- `/docs/automations` — Automations (n8n / OpenClaw + native canvas) `phase-2`
- `/docs/connections` — Connections (account-wide credentials) `phase-2`
- `/docs/agents` — Cantila Agents (self-healing brain) `live`
- `/docs/templates` — Template marketplace
- `/docs/auto-wired` — Auto-wired services *(exists; revise, becomes the overview that links DB/Mail/SMS)*

**Cantila + Claude**
- `/docs/mcp` — The Cantila MCP server *(exists)*
- `/docs/claude-account` — Connect your Claude account

**Account**
- `/docs/billing` — Plans, billing & invoices *(exists)*
- `/docs/teams` — Teams & roles
- `/docs/orgs` — Organizations & sub-accounts
- `/docs/auth` — Auth, sessions & 2FA

**CLI**
- `/docs/cli` — The Cantila CLI: install & auth *(exists; revise to match real command map)*
- `/docs/cli/commands` — Command reference (full tree)
- `/docs/cli/config` — Configuration & environment variables

**API reference**
- `/docs/api` — Overview: base URL `/v1`, auth (session cookie vs API key), errors, idempotency, activity audit
- `/docs/api/projects` — Projects, deploys, env, logs, scaling, backups, instances
- `/docs/api/domains` — Domains & aliases
- `/docs/api/data` — Databases & storage buckets
- `/docs/api/mail` — Mail (fleet, send, inbox, deliverability, mailboxes, aliases) `phase-2`
- `/docs/api/sms` — SMS, OTP, numbers, voice, A2P `phase-3`
- `/docs/api/agents` — Agents, activity, monitoring, capacity, nodes
- `/docs/api/billing` — Billing, invoices, plan changes
- `/docs/api/account` — Accounts/me, team, orgs, invites, API keys, auth

**Cantilapay (payments)**
- `/docs/pay` — Overview: tenant-as-MoR on Adyen for Platforms, test vs live `phase-2`
- `/docs/pay/quickstart` — Install `@cantila/cantilapay`, authenticate, first payment
- `/docs/pay/sdk` — Node SDK reference (resources, methods, types, errors, idempotency)
- `/docs/pay/webhooks` — Webhook events & signature verification

~46 pages. `FLAT_DOCS`, `prevNext`, breadcrumbs, and the 404 logic in
`(docs)/layout.tsx` all derive from `DOCS_NAV`, so updating `docs-nav.ts` is the single
source change that wires navigation. Add an optional `keywords?: string[]` field to
`DocPage` to feed search.

## 4. UI polish (approved)

### 4.1 Right-rail "On this page" TOC
- New client component `src/components/marketing/OnThisPage.tsx`.
- On mount, query `#docs-content :is(h2, h3)[id]` (ids come from `rehype-slug`, already
  configured). Build a nested list; smooth-scroll on click; highlight the active section
  via `IntersectionObserver`.
- Layout: change `(docs)/layout.tsx` grid from `lg:grid-cols-[220px_1fr]` to
  `xl:grid-cols-[220px_1fr_200px]` (TOC hidden below `xl`, sidebar still collapses at `lg`).
- Light-mode styling to match the docs surface.

### 4.2 Copy buttons on code blocks
- Replace the `pre` mapping in `mdx-components.tsx` with a client component
  `src/components/marketing/CodeBlock.tsx` that renders the existing dark panel chrome and
  a copy button (top-right) reading its own `textContent` via `navigator.clipboard`.
  Shiki has already highlighted the inner `<code>` at build time; the wrapper only adds
  the button + "Copied" state. Respects reduced motion; button is `not-prose`.

### 4.3 Docs search (⌘K)
- New client component `src/components/marketing/DocsSearch.tsx`, modeled on the Console
  `CommandPalette` but light-themed. Indexes `FLAT_DOCS` (title + description + group +
  `keywords`). Fuzzy/substring filter, keyboard nav, navigate on select.
- Trigger: a search box at the top of `DocsSidebar` + a global ⌘K / Ctrl+K listener
  mounted in the docs layout (client island). Portal to `document.body`.

## 5. MDX component additions (`mdx-components.tsx`)
- `Badge` (§2).
- Swap `pre` → `CodeBlock` (§4.2).
- Keep existing `Callout`, `Note`, prose styles, tables (used for param/endpoint tables).
- For API/SDK params: use GFM tables (already styled) — `Field | Type | Required | Description`.

## 6. Conventions (all pages)
- **Voice:** instructive, verb-led, examples before explanation (matches existing docs +
  brand/voice "ship language"). Use the elements-of-style guidance.
- **Front-matter:** every MDX page exports `metadata = buildPageMetadata({ title, description, path, type: "article" })`.
- **Code samples:** real, runnable. CLI examples use `cantila …`; API examples use `curl`
  against `https://api.cantila.app/v1/…` with `Authorization: Bearer <api_key>`; SDK
  examples use `@cantila/cantilapay`.
- **Links:** relative in-app links (`/docs/...`, `/products/...`); the MDX `a` mapping
  opens `http(s)` links in a new tab automatically.
- **Endpoint docs:** `METHOD /v1/path` heading, one-line purpose, auth, request table,
  response example. Group by resource, not one page per endpoint.

## 7. Build approach — parallel agents, then integrate
1. **Foundation (author directly, serial):** rewrite `docs-nav.ts` to the new IA; add
   `Badge` + `CodeBlock` to `mdx-components.tsx`; build `OnThisPage`, `DocsSearch`; wire
   the layout grid + search. Revise the docs index `page.tsx` (already group-driven).
2. **Content (parallel sub-agents):** one agent per sidebar group (8 groups). Each agent
   receives: the exact page list for its group, the accuracy sources (file paths + plan
   sections), the conventions above, and the MDX component contract. Agents write the MDX
   files only; they do not touch shared infra.
3. **Integration & verify (serial):** `tsc --noEmit`, `next lint`, `next build`; then
   drive the browser at `/docs` to confirm nav, TOC, copy, search, and a phase-badged page
   render. Fix issues.

Each content agent is grounded and isolated (writes its own MDX files), so parallelism is
safe — no shared-state writes.

## 8. Risks / decisions
- **Slug stability:** keep `/docs/getting-started` (titled "Quickstart") rather than moving
  to `/docs/quickstart`, to avoid breaking existing inbound links (marketing CTAs link to
  `/docs/getting-started`). *(Decision: keep the slug.)*
- **API accuracy depth:** ~134 endpoints — document the user-facing resources with the
  common operations and realistic request/response shapes; do not enumerate internal/`_test`
  routes (e.g. `/v1/agents/_test/*`, `/v1/billing/_test/*`, node heartbeat/sweep). Mark
  internal endpoints out of scope.
- **Phase honesty:** Mail/SMS/Voice/Numbers/A2P and OAuth connections get explicit badges
  + "what works today" callouts per plan §15.2.
- **Search scope:** v1 indexes titles/descriptions/keywords (not full body text) to keep it
  client-side and dependency-free; note as a future enhancement.
