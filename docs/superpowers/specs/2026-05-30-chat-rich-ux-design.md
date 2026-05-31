# Rich Chat UX + Orchestration/Fleet (sub-project C) — Design

**Date:** 2026-05-30
**Surface:** `cantila-console` workspace chat (`ProjectChat.tsx`, `ProjectChatMessages.tsx`)
**Status:** Approved design — ready to build
**Scope:** Frontend only. No backend/route changes; reuses `chatStream`/`buildStream`, the existing message model, and `getAgentOrg` for agent identities. Multi-conversation history (sub-projects A+B) is a later cycle. Attachments deferred.

## Goal

Bring the project chat up to modern AI-chat standards — rich rendering, message actions, an upgraded composer, status affordances — while making the **agent orchestration and its fleet first-class**: every message and op-card is attributed to a fleet agent, and live fleet activity is visible during a run.

## Current state

`ProjectChat` loads a single per-project thread (`GET /v1/projects/:id/chat`), streams via `chatStream`/`buildStream` (SSE), and renders a `ChatMsg[]` of `user` / `agent` / `op` / `result` variants through `ProjectChatMessages`. Agent text is plain (`whitespace-pre-wrap`); op-cards already carry `{ key, title, status, agent, detail, log, asset }`. There is an agents/org API (`getAgentOrg`, `agentsStatus`). The two files have grown (246 + 390 lines); this cycle splits them into focused units.

## Architecture — new file structure (`src/components/chat/`)

- **`agentMeta.ts`** — resolves an agent key (e.g. `"orchestrator"`, `"image"`, `"seo"`) to `{ label, role, color }`. A static map for known fleet roles + a deterministic color from the key hash for unknown ones. Optionally enriched once from `getAgentOrg` (cached in a module-level promise). Pure + a small hook `useAgentMeta()`.
- **`Markdown.tsx`** — renders markdown (gfm) with syntax-highlighted fenced code blocks, each with a copy button. Built on `react-markdown` + `remark-gfm` + `rehype-highlight` (or `highlight.js`), styled to the console theme. Used for agent + user text.
- **`ChatMessage.tsx`** — one message bubble: role styling (user vs agent), the fleet **agent badge** (color initial-avatar + label) from `agentMeta`, timestamp, `Markdown` body, and a hover **action toolbar** (copy / regenerate / edit). Consecutive same-agent messages group (badge shown once).
- **`OpCard.tsx`** — extracted + enhanced op-card: agent badge, status icon (running spinner / done / failed), title, detail, collapsible log lines, asset preview (keep existing behavior).
- **`FleetStrip.tsx`** — a compact strip shown at the top of the thread while a run is active: avatars/labels of agents currently working (derived from running ops + recent agent messages), with a subtle pulse. Hidden when idle.
- **`ChatComposer.tsx`** — auto-grow `textarea` (Enter = send, Shift+Enter = newline), a **Build ⇄ Chat** mode toggle, a minimal **/slash-command** menu (`/build`, `/deploy`, `/env`, `/domains` — inserts or routes intent), and a send/**stop** button (stop shown while streaming).
- **`ProjectChat.tsx`** (rewritten, slim) — owns `messages`, `running`, `mode`, `cancelRef`; wires the existing stream callbacks; renders `FleetStrip` + the message list (`ChatMessage`/`OpCard`) + `ChatComposer`; implements stop / regenerate / edit-resend; keeps `initialBuildPrompt` + `onAssetCreated` behavior.
- **`ProjectChatMessages.tsx`** — keep the `ChatMsg` / `ChatOp` types + `projectMessagesToChat` mapper here (or move to `chat/types.ts`); the rendering moves to the new components.

## Features

### Rich rendering
Markdown + fenced code with copy. Bubbles: user right-aligned/ink, agent left with badge. Timestamps (relative, e.g. "2m ago"). Grouping by consecutive agent.

### Orchestration / fleet
- `agentMeta` gives each agent a stable label/role/color; the badge appears on agent messages and op-cards.
- `FleetStrip` surfaces who's active during a run.
- Known roles seeded (orchestrator, builder/scaffold, image/media, seo, deploy, security, …) with sensible colors; unknown agents get a hashed color + titled key.

### Message actions (hover toolbar)
- **Copy** — copies the message's text.
- **Regenerate** — on an agent turn (or its preceding user turn), re-runs `runStream` with that user prompt; truncates messages after that turn first.
- **Edit & resend** — on a user message, inline-edit then re-run from there (truncate subsequent messages).
- **Stop** — while `running`, calls `cancelRef.current?.()` to halt the SSE and marks any running ops as interrupted.

### Composer
Auto-grow textarea; Enter/Shift+Enter; mode toggle persisted to `localStorage` (`cantila:chat-mode:<projectId>`); slash menu filtered as you type `/…`; send disabled when empty, replaced by a **Stop** button while running.

### Status & affordances
- **Typing indicator**: when running, "▍ {activeAgent} is working…" using the most recent running op/agent.
- **Scroll-to-bottom** floating button when the user has scrolled up; auto-stick to bottom when already at bottom.
- **Retry** affordance on stream error (re-run last prompt).
- **Empty state**: when the thread is empty, show prompt-suggestion chips (e.g. "Build a landing page", "Add a contact form", "Connect a domain") that send on click.

## Data flow
1. On mount: load history (`projectMessagesToChat`) as today; kick off `agentMeta` org enrichment (non-blocking).
2. Send: `runStream(mode === "build", text)` — unchanged stream wiring; callbacks update `messages` (agent text, op upsert) as now.
3. Stop: `cancelRef.current?.()`. Regenerate/edit: truncate `messages` to the target turn, then `runStream`.
4. Fleet identities resolved client-side via `agentMeta` (+ cached `getAgentOrg`); no new endpoints.

## Error handling
- Stream error → an inline error bubble + a Retry button (re-runs the last user prompt). (Today it appends an `orchestrator` error message; keep that as the bubble.)
- Markdown render is sandboxed (no raw HTML execution — `react-markdown` escapes HTML by default; do **not** enable `rehype-raw`). Untrusted agent/user text is safe.
- `getAgentOrg` failure → `agentMeta` falls back to the static map + hashed colors; chat unaffected.
- localStorage unavailable → in-memory defaults (mode = build|chat default), wrapped in try/catch.

## Testing
No console test runner; verify via `npm run lint` + `npm run build` + manual:
- Markdown + code copy render correctly; no raw-HTML injection.
- Agent badges + colors appear on messages and op-cards; FleetStrip shows during a run, hides when idle.
- Copy / regenerate / edit-resend / stop each behave (use a real project build/chat).
- Composer: Enter sends, Shift+Enter newlines, auto-grows; mode toggle persists; slash menu filters.
- Scroll-to-bottom appears when scrolled up; empty-state chips send; error shows Retry.
- Fits the narrowed chat column and the full-bleed workspace.

## Files
**New:** `src/components/chat/agentMeta.ts`, `Markdown.tsx`, `ChatMessage.tsx`, `OpCard.tsx`, `FleetStrip.tsx`, `ChatComposer.tsx` (under `src/components/chat/`).
**Modified:** `src/components/ProjectChat.tsx` (slim orchestrator), `src/components/ProjectChatMessages.tsx` (retain types + mapper; rendering moves out).
**Dependency:** `react-markdown`, `remark-gfm`, `rehype-highlight` (+ a highlight.js theme).
