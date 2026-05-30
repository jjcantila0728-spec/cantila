# Workspace: VS Code-style 4-column layout — Design

**Date:** 2026-05-30
**Surface:** `cantila-console` route `/(console)/[handle]/[project]` (e.g. `console.cantila.app/@cantila/cantilahomes`)
**Component entry point:** `src/components/ProjectWorkspace.tsx`
**Status:** Approved design — ready for implementation plan

## Goal

Turn the per-project workspace into a compact, VS Code-like environment: four
adjustable columns, left to right —

```
┌ ●cantilahomes  live                         ↗Open  ⚙ ┐   slim ~36px toolbar
├────────┬───────────────┬──────────────┬──────────────┤
│  icon  │  file-tree    │    chat      │   preview    │
│  rail  │  + editor     │  (agents)    │  web/mobile  │
│  64px  │   ‖ drag ‖    │   ‖ drag ‖   │  + tabs      │
└────────┴───────────────┴──────────────┴──────────────┘
```

`‖` = draggable, width-persisted splitter. The layout is desktop (`lg+`) only;
narrower viewports fall back to the existing stacked/tabbed path.

## Scope of THIS cycle

This is **sub-project B** of two. Sub-project A (a full Cantila-hosted git file
store, MCP file ingest, GitHub push/pull sync for Cantila-native projects) is a
separate, later cycle.

In scope now:

- The 4-column resizable shell + slim toolbar.
- File-tree + **editable** code editor for the project's **connected GitHub
  repo**, with Save committing back to GitHub.
- Preview column: live web/mobile preview + Deploys / Env / Domains / Brain.
- Brain panel gains a **read-only** autoscale/compute readout and folds Logs in.

Explicitly OUT of scope this cycle:

- Cantila-hosted editable file store (projects with no `repoUrl` stay
  non-editable; the tree shows an empty/connect state).
- Autoscale **controls** (compute readout is display-only).
- Git pull/branch/PR UI beyond commit-to-default-branch on Save.

## Decisions captured during brainstorming

| Question | Decision |
|---|---|
| File-tree data source | The project's real source files. Long-term Cantila acts like GitHub (store pushed files, edit, push back). This cycle reads the **connected GitHub repo**. |
| Sequencing | Layout shell first; Cantila file-store backend is the next cycle. |
| Preview column top | Live-site **iframe** with **web / mobile** toggle (mobile renders inside a phone frame). |
| Preview tabs | **Deploys / Env / Domains / Brain** only. Overview & Assets removed; Logs folds into Brain; Settings moves to the toolbar gear. |
| Brain autoscale | **Read-only** readout (instances, load %, scale state) + logs. |
| Top chrome | Replace tall header with a **slim ~36px toolbar**. |
| Editing | Files are **editable**. Save **commits back to the connected GitHub repo**. |
| Splitter approach | Extend the existing hand-rolled pointer-capture resizer into one reusable `<Splitter>` (no new dependency). |
| Editor | **CodeMirror 6** (light, multi-language). Monaco was the heavier alternative; not chosen. |

## Architecture

### Column 1 — Icon rail

Reuse the existing global `Sidebar` in its collapsed (64px icon) state. The
workspace ensures the sidebar is collapsed on mount to maximize horizontal space.
Since `useNavDrawer()` today only exposes `toggleCollapsed` (a toggle), add a
small `setCollapsed(true)`-style helper (or call `toggleCollapsed` guarded by the
current `collapsed` value) so entering the workspace deterministically collapses
rather than flips it. No new component.

### Column 2 — File-tree + editor (`ProjectFileTree.tsx`, new)

- Upper region: a scrollable file tree of the connected repo.
- Lower region: a CodeMirror 6 editor, read/write, with a resizable internal
  split between tree and editor.
- File operations, each backed by the GitHub API via the control-plane proxy:
  - **Edit + Save** → update file (requires the file's blob `sha`) = one commit.
  - **New file** → create file.
  - **Delete** → delete file.
  - **Rename** → delete + create (two commits this cycle; single-tree commit is a
    later optimization).
- Editor UX: per-file dirty dot, `Ctrl/Cmd+S` to save, optional commit message
  (default `Update <path> via Cantila`), commits to the repo's default branch.
- Empty state when `repoUrl` is unset or unreadable: "No repo connected — files
  appear here once a repo is connected via MCP."
- Read-only fallback (with notice) when no write-scoped token is available.

### Column 3 — Chat

Unchanged: existing `ProjectChat` (the agent team / subagents). Reparented into
the new flex row; still receives `initialBuildPrompt` and `onAssetCreated`.

### Column 4 — Preview (`PreviewColumn.tsx`, new wrapper)

- Top: `LivePreview.tsx` (new) — an iframe of the project's primary domain.
  - **Web / Mobile** toggle. Web = full-width iframe. Mobile = iframe inside a
    ~390px-wide phone frame, centered.
  - Refresh + open-in-new-tab controls.
  - Empty state when no live domain is resolved yet.
- Below: a trimmed tab strip — **Deploys / Env / Domains / Brain** — reusing
  existing `ProjectDeploysPanel`, `ProjectEnvPanel`, `ProjectDomainsPanel`, and
  the extended `ProjectBrainPanel`.

### Brain panel (extended `ProjectBrainPanel.tsx`)

- Keep the existing memory/summary readout.
- Add a **Compute (autoscale)** section: instances, load %, scale range/state —
  **read-only**, wired to the existing capacity/nodes data. If no per-project
  granularity exists, show the node-level summary the capacity views already use.
- Fold the existing `ProjectLogsPanel` content in below the compute section
  (Logs is no longer its own tab).

### Toolbar (replaces the tall header)

One ~36px row: status dot + project name on the left; `↗ Open` (primary domain)
and `⚙` on the right. `⚙` opens `ProjectSettingsPanel` in a modal/popover
(Settings is no longer a column tab). Breadcrumb + runtime/region metadata are
dropped to recover vertical space.

### Splitter (`Splitter.tsx`, new — generalized from `startResize`)

- Pointer-capture drag handle, identical interaction to today's rail resizer
  (`ProjectWorkspace.startResize`): min/max clamp, double-click to reset.
- Two instances: tree│chat and chat│preview. Each persists its width under its
  own `localStorage` key (e.g. `cantila:workspace-tree-w`,
  `cantila:workspace-preview-w`), read after mount to avoid SSR mismatch.

## Backend (control-plane) — new endpoints

All under the existing `/api/cantila/v1` proxy; server-side GitHub calls use a
**`GITHUB_TOKEN`** env (write scope required for edits; unauthenticated fallback
for reading public repos).

| Method & path | Purpose | GitHub call |
|---|---|---|
| `GET /v1/projects/:id/files?recursive=1` | List repo tree | `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` |
| `GET /v1/projects/:id/files/content?path=&ref=` | Read one file | `GET /repos/{owner}/{repo}/contents/{path}` |
| `PUT /v1/projects/:id/files/content` | Create/update file (body: path, content, sha?, message?) | `PUT /repos/{owner}/{repo}/contents/{path}` |
| `DELETE /v1/projects/:id/files/content?path=&sha=` | Delete file | `DELETE /repos/{owner}/{repo}/contents/{path}` |

- `owner/repo/branch` are derived from `Project.repoUrl` (+ default branch lookup).
- **Save → deploy loop:** a commit fires the existing git webhook → auto-deploy →
  the live-preview iframe refreshes to reflect the change.
- **Conflict handling:** stale `sha` on PUT/DELETE → GitHub 409 → surface "file
  changed upstream, reload."

## Console API client (`src/lib/api.ts`)

Add to `builderApi`:

- `getProjectFiles(projectId, ref?)` → tree
- `getProjectFileContent(projectId, path, ref?)` → `{ content, sha, encoding }`
- `putProjectFile(projectId, { path, content, sha?, message? })` → commit result
- `deleteProjectFile(projectId, { path, sha, message? })` → commit result

## Data flow

1. Workspace mounts → resolve project (`getProjectByHandle`) → collapse sidebar.
2. File-tree column loads the repo tree via `getProjectFiles`.
3. Clicking a file loads content into CodeMirror via `getProjectFileContent`.
4. Edit + Save → `putProjectFile` (with `sha`) → commit → webhook → deploy.
5. Preview column iframe (web/mobile) renders the primary domain; refresh after a
   deploy completes.
6. Brain tab pulls memory + capacity/node data for the read-only compute readout
   and logs.

## Error handling

- No `repoUrl`: tree shows connect/empty state; editor disabled.
- No / non-write token: read-only mode with a banner; Save disabled.
- GitHub 409 (stale sha): reload-file prompt; no silent overwrite.
- GitHub 403/rate-limit: surface a retry message; fall back to cached tree if any.
- Live domain unresolved: preview shows a "not deployed yet" placeholder.

## Testing

- `Splitter`: drag clamps to min/max; double-click resets; width persists.
- File-tree: renders nested tree; selecting a file loads content; empty/no-repo
  state renders.
- Editor: dirty state tracks edits; `Ctrl/Cmd+S` triggers save; read-only mode
  when token absent.
- Save path (control-plane): create/update/delete map to correct GitHub calls;
  stale-sha surfaces 409; missing token → read-only.
- LivePreview: web vs mobile toggle swaps frame; refresh reloads iframe.
- Brain: compute readout renders from capacity data; logs section renders.
- Responsive: `< lg` falls back to the existing stacked/tabbed path.

## Components touched / added

**New:** `ProjectFileTree.tsx`, `LivePreview.tsx`, `PreviewColumn.tsx`,
`Splitter.tsx`.
**Modified:** `ProjectWorkspace.tsx` (4-column shell + slim toolbar),
`ProjectBrainPanel.tsx` (compute + logs), `src/lib/api.ts` (file methods),
control-plane router (files endpoints).
**Removed from workspace tabs:** Overview, Assets, standalone Logs, Settings tab
(Settings → toolbar `⚙`).
