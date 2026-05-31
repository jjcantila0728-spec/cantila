# Browser-style Preview + Ops Drawer — Design

**Date:** 2026-05-30
**Surface:** `cantila-console` — the workspace preview column (`src/components/workspace/PreviewColumn.tsx` and `LivePreview.tsx`)
**Status:** Approved design — ready for implementation plan
**Scope:** Frontend only. No backend/route changes; reuses existing project panels.

## Goal

Make the workspace preview column a **browser-style hero**: the live site fills most of the column with real browser chrome (multiple page tabs + web/mobile device toggle), while the operational surfaces (Deploys / Env / Domains / Brain) move into a **slide-over drawer** that overlays the preview instead of shrinking it. Deploys opens by default.

## Current state

`PreviewColumn` renders `LivePreview` (an iframe with a web/mobile toggle) at the top and a tab strip below that swaps `ProjectDeploysPanel` / `ProjectEnvPanel` / `ProjectDomainsPanel` / `ProjectBrainPanel` in the lower half. The ops tabs and the preview split the height evenly, so the preview never feels dominant.

## Target layout

```
┌──────────────── preview column (full height) ───────────────────┐
│ [ / ✕ ] [ /pricing ✕ ] [ preview-x ✕ ] [+]      ← browser tabs   │
│ ↻  git.cantila.app/pricing            ▢web ▯mobile  ↗ ← toolbar  │
│                                                                   │
│              [ live site iframe — BIG ]        ← largest area    │
│              (mobile = centered phone frame)                      │
│                                                                   │
│ ┌─ ops drawer (overlay; Deploys default) ───────────────────⌄─┐ │
│ │ [Deploys] [Env] [Domains] [Brain]                           │ │
│ │  …active panel…                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Components

### `BrowserPreview.tsx` (new — replaces `LivePreview`)
A browser-chrome wrapper around the live iframe.

- **Props:** `{ baseUrl: string | null }` (the project's primary domain, e.g. `https://cantilahomes.cantila.app`).
- **Tabs:** an array of `{ id, url, device: "web" | "mobile" }`. Initial state = one tab at `baseUrl` (web). A `+` button opens a new tab at `baseUrl`. Each tab shows a short label (the path, or host for the root) + a close ✕ (closing the last tab leaves one). Active tab highlighted.
- **Toolbar (for the active tab):**
  - Refresh ↻ — reloads the iframe (bump a per-tab `nonce`).
  - **Address bar** — a text input showing the active tab's `url`; on Enter, sets that tab's `url` (and normalizes: prepend `https://` and constrain to the project's host so it stays an in-app preview, or allow any URL — see Decisions).
  - **Device toggle** — web / mobile; mobile renders the iframe inside a ~390px phone frame, centered.
  - Open-external ↗ — opens the active `url` in a real browser tab.
  - **No back/forward** — the preview is cross-origin, so the parent can't read the iframe's internal navigation or drive history reliably. Omitted by decision.
- **iframe:** `key={tab.id + ":" + nonce}` so refresh/url changes remount; `src = tab.url`; web = full-bleed, mobile = phone frame. Empty state when `baseUrl` is null ("Not deployed yet…").
- **State persistence:** the open tabs + active tab id persist to `localStorage` under `cantila:preview-tabs:<projectId>` (so reopening the workspace restores the browser session). Device mode is per-tab and part of that state.

### `OpsDrawer.tsx` (new)
A bottom-sheet drawer that overlays the lower part of the preview.

- **Props:** `{ detail, onRefresh, projectId }` (same data the panels need).
- **Header:** tab buttons **Deploys / Env / Domains / Brain** + a collapse chevron ⌄ (and an expand affordance when collapsed).
- **State:** `open` (bool) + `tab` ("deploys" | "env" | "domains" | "brain"), persisted to `localStorage` (`cantila:preview-drawer`). **Default: open, tab = "deploys".**
- **Behavior:** clicking a tab selects it and ensures the drawer is open; the chevron collapses the drawer to just its header bar (preview becomes full-height); clicking a tab while collapsed reopens it. The drawer is positioned `absolute` over the bottom of the preview area (it overlays, it does not resize the iframe) with a height of ~45% (a sensible fixed fraction; not user-resizable in this cycle — YAGNI).
- **Body:** renders the active panel — reusing `ProjectDeploysPanel detail onRefresh` / `ProjectEnvPanel projectId` / `ProjectDomainsPanel detail onRefresh` / `ProjectBrainPanel projectId` unchanged.

### `PreviewColumn.tsx` (modified)
Composes the two: a relative-positioned container with `BrowserPreview` filling it and `OpsDrawer` absolutely docked at the bottom. Passes `baseUrl = liveUrl`, `detail`, `onRefresh`, `projectId`.

## Data flow
1. `ProjectWorkspace` already passes `detail`, `liveUrl`, `onRefresh` to `PreviewColumn` — unchanged.
2. `PreviewColumn` → `BrowserPreview baseUrl={liveUrl}` + `OpsDrawer detail onRefresh projectId`.
3. Tab/drawer state lives in the two new components and persists to localStorage; no server calls beyond what the reused panels already do.

## Decisions / clarifications resolved
- **Browser tabs = "Both":** multiple page tabs AND a per-tab web/mobile device toggle.
- **Drop ◀ ▶** (cross-origin can't support history). Keep ↻, address bar, device toggle, open-external.
- **Drawer overlays** the preview (preview stays the largest area), default-open on Deploys.
- **Address bar scope:** accept any absolute URL the user types, defaulting/normalizing to `https://` when no scheme is given. (Not restricted to the project host — a user may want to preview a deploy-preview subdomain. Open-external uses the same value.)
- **Drawer height** is a fixed fraction (~45%), collapsible but not drag-resizable this cycle.

## Error handling
- `baseUrl` null → BrowserPreview shows the "not deployed yet" empty state; tabs still render but the iframe area shows the placeholder.
- Malformed address input → normalized (`https://` prefix); if still invalid, the iframe simply fails to load (browser-native), no app crash.
- localStorage unavailable → fall back to in-memory default (one tab, drawer open on Deploys); wrapped in try/catch like the existing width-persistence code.

## Testing
No test runner in the console; verification is `npm run lint` + `npm run build` + manual:
- Tabs: `+` opens a new tab at baseUrl; closing removes it (never below one); switching highlights the active tab and swaps the iframe.
- Address bar: typing a path + Enter navigates the active tab's iframe; open-external opens it in a real tab.
- Device toggle: web = full width, mobile = phone frame.
- Drawer: opens on Deploys by default; tab switch swaps panel; chevron collapses to a bar and the preview goes full-height; reopening restores the last tab; state persists across reload.
- Responsive: column still behaves inside the full-bleed workspace; on the `< lg` stacked fallback, `PreviewColumn` continues to render (drawer overlay still works).

## Files
**New:** `src/components/workspace/BrowserPreview.tsx`, `src/components/workspace/OpsDrawer.tsx`.
**Modified:** `src/components/workspace/PreviewColumn.tsx` (compose the two; drop the old inline tab strip + `LivePreview` usage).
**Removed/!superseded:** `LivePreview.tsx` is superseded by `BrowserPreview` (delete it, and drop its import from `PreviewColumn`).
