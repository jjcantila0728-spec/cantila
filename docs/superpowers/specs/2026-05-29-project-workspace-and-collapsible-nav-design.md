# Project workspace completion + collapsible main nav — design

Date: 2026-05-29
Branch: `feat/workspace-and-collapsible-nav`
Status: approved (design), pending implementation plan

## Goal

Two related Console UI workstreams:

- **A — Complete the project workspace** at `/@handle/<project>`
  (`src/app/(console)/[handle]/[project]/page.tsx` →
  `ProjectWorkspace.tsx`). The page is chat-first and substantially built,
  but two follow-ups are flagged in its own comments: the right-column
  "Working on it" tab is a placeholder, and the operational surfaces
  (deploys / env / domains / settings) still live only on the legacy
  `/projects` pages. Merge them into the workspace, wired to the **real**
  control-plane API (no mock data).
- **B — Collapsible main nav.** Make the desktop console sidebar
  (`Sidebar.tsx` + `ConsoleShell.tsx`) collapsed by default (icon rail),
  expandable via a pinned click toggle, with a **push** animation (content
  slides over, no overlay). This is a global change affecting every
  console page.

## Constraints / context

- Operational actions already exist on the real `api` object in
  `src/lib/api.ts` and go through the same authenticated proxy
  (`/api/cantila/v1/*`): `getLogs`, `listEnv`/`setEnv`, `addDomain`,
  `scale`, `deploy`, `rollback`, `listInstances`. The workspace already
  loads `ApiProjectDetail` (`project`, `services`, `deployments`,
  `domains`) via `builderApi.getProjectByHandle`.
- The legacy `ProjectView.tsx` is **mock-typed** (`@/lib/types`,
  `mock-data`). It is the **visual reference only** — panels are ported to
  `Api*` types, not imported.
- The shell already has a "push" pattern: the mobile drawer shifts content
  via `translate-x` with a shared `PUSH` easing constant. Workstream B
  reuses that grain.

## Workstream A — Project workspace

### Layout: resizable rail
- Keep two columns on `lg+`: `ProjectChat` (flex-1, left) and the rail
  (right). Add a draggable divider between them.
- Rail width persists to `localStorage` key `cantila:workspace-rail-w`,
  clamped ~22rem–48rem. Double-click the divider resets to default.
- Rail tab strip becomes a single horizontally-scrollable icon+label row
  (`overflow-x-auto`, the pattern the legacy tab bar already uses) so all
  tabs fit.
- Mobile (`<lg`) stays stacked exactly as today; no resize handle.

### Rail sub-tabs (drop the placeholder "Working on it" tab)
All read `detail` (already loaded) or call `api.*` with
`detail.project.id`. Mutating tabs refetch `getProjectByHandle` to refresh
`detail`; a `refresh()` is threaded down. Each tab owns its
loading/empty/error state.

1. **Overview** *(new default)* — production deployment (commit / branch /
   trigger / build time from `detail.deployments`), live URL, linked
   services (`detail.services.database / mailbox / phoneNumber`), domains
   summary, plus **Redeploy** (`api.deploy`) and **Open**.
2. **Assets** — unchanged (`ProjectAssetGallery`).
3. **Brain** — unchanged (`ProjectBrainPanel`).
4. **Deploys** — history from `detail.deployments` with status badges;
   **Redeploy** (`api.deploy`) and **Rollback** (`api.rollback`).
   Real-API port of `DeployList`.
5. **Logs** — `api.getLogs(projectId)`, newest deployment's log lines,
   with a refresh button.
6. **Environment** — `api.listEnv` + add-variable modal via `api.setEnv`
   (port of legacy `EnvTab`).
7. **Domains** — `detail.domains` + add-domain modal via `api.addDomain`,
   surfacing the returned DNS/SSL hints.
8. **Settings** — vertical scale (vCPU / memory / disk) + always-on via
   `api.scale`.

### Out of scope (no backing endpoint)
- **Metrics tab** — no per-project metrics endpoint (monitoring is
  account-wide). Omitted.
- **Pause / Delete** danger-zone actions — no control-plane endpoints.
  Omitted rather than faked.
- Instance-health readout in Overview — deferred (could use
  `api.listInstances` later).

## Workstream B — Collapsible main nav (global)

- **Collapsed by default**: desktop sidebar starts as a **64px** icon rail
  (`w-16`), expands to the existing **240px** (`w-[240px]`). `lg+` only —
  the mobile drawer is untouched.
- **State**: lives in `ConsoleShell` context (mirroring the existing
  `NavDrawerCtx`), persisted to `localStorage` key `cantila:nav-collapsed`,
  default `true`. Hydration via `useState(true)` + `useEffect` load of the
  stored value (brief collapsed→expanded settle only for users who pinned
  open; acceptable).
- **Click toggle, pinned**: a chevron button in the sidebar brand header
  flips collapsed⇄expanded; state persists across pages and reloads.
- **True push**: the content wrapper's `lg:pl-[240px]` animates between
  `lg:pl-16` (collapsed) and `lg:pl-[240px]` (expanded); the `<aside>`
  width animates in lockstep, reusing the `PUSH` easing constant.
  Expanding slides content right — no overlay.
- **Collapsed rendering** of `SidebarContent`: `BrandMark` only (no
  wordmark), icon-only nav with the ember active-bar preserved, group
  headings hidden, deploy CTA → icon button, account chip → avatar only;
  `title` tooltips supply labels on hover.
- **Audit**: grep for other hardcoded `pl-[240px]` / `240` offsets that
  assume a fixed sidebar width and update them to track the collapsed
  state.

## Testing / verification

- `npm run lint` + type-check clean.
- Manual (evidence, not assertion):
  - Nav collapses by default; toggle pins and persists across reloads and
    route changes; content pushes (no overlay); mobile drawer unaffected.
  - On `/@cantila/cantilahomes`: rail resizes and width persists; every tab
    loads real data; redeploy / rollback / env-add / domain-add round-trip.

## Files touched

- `src/components/ProjectWorkspace.tsx` (rail + tabs)
- new tab components beside it (Overview / Deploys / Logs / Env / Domains /
  Settings, `Api*`-typed)
- `src/components/Sidebar.tsx` (collapsed rendering + toggle)
- `src/components/ConsoleShell.tsx` (collapse context, persistence, push)
- audit pass for hardcoded sidebar-width offsets
