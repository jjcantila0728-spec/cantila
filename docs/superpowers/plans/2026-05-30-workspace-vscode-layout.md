# VS Code-style Workspace Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/@handle/<project>` into a compact, VS Code-like workspace: four adjustable columns — icon rail │ editable GitHub-backed file-tree + editor │ chat │ preview (web/mobile + Deploys/Env/Domains/Brain) — with a slim toolbar.

**Architecture:** Add a thin GitHub Contents-API client to the control-plane (read tree/file, commit write/delete) exposed as `/v1/projects/:id/files*` routes. The console gains a reusable `<Splitter>`, a `ProjectFileTree` (CodeMirror 6 editor), a `LivePreview` (web/mobile iframe), a `PreviewColumn`, an extended `ProjectBrainPanel` (read-only autoscale + logs), and a rewritten `ProjectWorkspace` shell. Editing commits straight to the connected repo's default branch; the existing git webhook then auto-deploys, and the preview iframe refreshes.

**Tech Stack:** Control-plane = Fastify + Prisma + TypeScript (tests via `node:test` run with `npx tsx --test`). Console = Next.js 14 (App Router) + Tailwind + lucide-react; new editor dep `@uiw/react-codemirror`. No test runner is configured in either repo — UI verification is `npm run lint` + `npm run build` + manual run; pure control-plane logic is TDD'd with `node:test`.

**Spec:** `docs/superpowers/specs/2026-05-30-workspace-vscode-layout-design.md`

**Branch:** `feat/workspace-vscode-layout` (already created off `origin/main`; spec already committed).

**Repos (absolute):**
- Console: `c:/Users/canti/OneDrive/Documents/Claude/Projects/cantila/cantila-console`
- Control-plane: `c:/Users/canti/OneDrive/Documents/Claude/Projects/cantila/cantila-control-plane`

---

## File Structure

**Control-plane (new):**
- `src/github/github-files.ts` — GitHub Contents API client: `parseRepo`, `getDefaultBranch`, `listTree`, `readFile`, `writeFile`, `deleteFile`.
- `src/github/github-files.test.ts` — `node:test` unit tests for `parseRepo` + error mapping.

**Control-plane (modified):**
- `src/core/control-plane.ts` — add `listProjectFiles`, `readProjectFile`, `writeProjectFile`, `deleteProjectFile`.
- `src/index.ts` — add 4 routes + zod schemas under the existing project-routes block.

**Console (new):**
- `src/components/workspace/Splitter.tsx` — reusable drag-to-resize handle.
- `src/components/workspace/ProjectFileTree.tsx` — repo tree + CodeMirror editor + save.
- `src/components/workspace/LivePreview.tsx` — iframe with web/mobile toggle.
- `src/components/workspace/PreviewColumn.tsx` — LivePreview + Deploys/Env/Domains/Brain tabs.

**Console (modified):**
- `src/lib/api.ts` — file types + `builderApi` file methods (and `getProjectInstances`/`getProjectMetrics` if missing).
- `src/components/ProjectBrainPanel.tsx` — add Compute (autoscale) readout + fold in logs.
- `src/components/ProjectWorkspace.tsx` — 4-column shell + slim toolbar + settings modal.
- `src/components/ConsoleShell.tsx` — expose `collapse()` on the nav context.

---

## PHASE 1 — Control-plane: GitHub file backend

### Task 1: `parseRepo` (pure) — TDD

**Files:**
- Create: `src/github/github-files.ts`
- Test: `src/github/github-files.test.ts`

- [ ] **Step 1: Write the failing test**

`src/github/github-files.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRepo } from "./github-files";

test("parseRepo handles https URL with .git suffix", () => {
  assert.deepEqual(parseRepo("https://github.com/acme/site.git"), {
    owner: "acme",
    repo: "site",
  });
});

test("parseRepo handles https URL without .git", () => {
  assert.deepEqual(parseRepo("https://github.com/acme/site"), {
    owner: "acme",
    repo: "site",
  });
});

test("parseRepo handles trailing slash", () => {
  assert.deepEqual(parseRepo("https://github.com/acme/site/"), {
    owner: "acme",
    repo: "site",
  });
});

test("parseRepo returns null for non-github or empty", () => {
  assert.equal(parseRepo(""), null);
  assert.equal(parseRepo("not a url"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/github/github-files.test.ts`
Expected: FAIL — `parseRepo` is not exported / module missing.

- [ ] **Step 3: Write minimal implementation**

`src/github/github-files.ts`:
```ts
/* ============================================================
   GitHub Contents-API client for project files.
   Reads the connected repo's tree + file contents, and commits
   edits/creates/deletes back to the default branch. Used by the
   console workspace file-tree (read-only fallback when no token).
   ============================================================ */

export interface RepoRef {
  owner: string;
  repo: string;
}

/** Parse an https GitHub repo URL into {owner, repo}, or null. */
export function parseRepo(repoUrl: string): RepoRef | null {
  if (!repoUrl) return null;
  const m = repoUrl
    .trim()
    .replace(/\/+$/, "")
    .match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/github/github-files.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/github/github-files.ts src/github/github-files.test.ts
git commit -m "feat(files): GitHub repo URL parser"
```

---

### Task 2: GitHub Contents client (tree/read/write/delete)

**Files:**
- Modify: `src/github/github-files.ts`

- [ ] **Step 1: Add types + request helper + tree/read**

Append to `src/github/github-files.ts`:
```ts
const API = "https://api.github.com";

export interface FileNode {
  path: string;
  type: "blob" | "tree";
  sha: string;
}
export interface FileContent {
  content: string; // decoded UTF-8
  sha: string;
  encoding: "utf-8";
}
export class GithubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function headers(token: string): Record<string, string> {
  const h: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "cantila-console",
    "x-github-api-version": "2022-11-28",
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...headers(token), ...(init?.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) {
    let msg = `github ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new GithubError(res.status, msg);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export async function getDefaultBranch(ref: RepoRef, token: string): Promise<string> {
  const repo = await gh<{ default_branch: string }>(
    `${API}/repos/${ref.owner}/${ref.repo}`,
    token,
  );
  return repo.default_branch;
}

/** Full recursive tree (blobs + subtrees) for a branch. */
export async function listTree(
  ref: RepoRef,
  branch: string,
  token: string,
): Promise<FileNode[]> {
  const data = await gh<{ tree: { path: string; type: string; sha: string }[] }>(
    `${API}/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token,
  );
  return data.tree
    .filter((t) => t.type === "blob" || t.type === "tree")
    .map((t) => ({ path: t.path, type: t.type as "blob" | "tree", sha: t.sha }));
}

export async function readFile(
  ref: RepoRef,
  path: string,
  branch: string,
  token: string,
): Promise<FileContent> {
  const data = await gh<{ content: string; encoding: string; sha: string }>(
    `${API}/repos/${ref.owner}/${ref.repo}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  const content =
    data.encoding === "base64"
      ? Buffer.from(data.content, "base64").toString("utf-8")
      : data.content;
  return { content, sha: data.sha, encoding: "utf-8" };
}
```

- [ ] **Step 2: Add write + delete**

Append:
```ts
export interface WriteInput {
  path: string;
  content: string; // UTF-8 (will be base64-encoded)
  sha?: string; // required for update; omit for create
  message?: string;
  branch: string;
}
export interface DeleteInput {
  path: string;
  sha: string;
  message?: string;
  branch: string;
}

function encPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function writeFile(
  ref: RepoRef,
  input: WriteInput,
  token: string,
): Promise<{ commitSha: string; sha: string }> {
  const body = {
    message: input.message ?? `Update ${input.path} via Cantila`,
    content: Buffer.from(input.content, "utf-8").toString("base64"),
    branch: input.branch,
    ...(input.sha ? { sha: input.sha } : {}),
  };
  const data = await gh<{ commit: { sha: string }; content: { sha: string } }>(
    `${API}/repos/${ref.owner}/${ref.repo}/contents/${encPath(input.path)}`,
    token,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return { commitSha: data.commit.sha, sha: data.content.sha };
}

export async function deleteFile(
  ref: RepoRef,
  input: DeleteInput,
  token: string,
): Promise<{ commitSha: string }> {
  const body = {
    message: input.message ?? `Delete ${input.path} via Cantila`,
    sha: input.sha,
    branch: input.branch,
  };
  const data = await gh<{ commit: { sha: string } }>(
    `${API}/repos/${ref.owner}/${ref.repo}/contents/${encPath(input.path)}`,
    token,
    { method: "DELETE", body: JSON.stringify(body) },
  );
  return { commitSha: data.commit.sha };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/github/github-files.ts
git commit -m "feat(files): GitHub contents client (tree/read/write/delete)"
```

---

### Task 3: Control-plane core file methods

**Files:**
- Modify: `src/core/control-plane.ts`

Resolve the project, derive `{owner, repo}` from `repoUrl`, use `config.githubToken`. Return discriminated results so routes can map status codes.

- [ ] **Step 1: Import the client + config at the top of control-plane.ts**

```ts
import { config } from "../config";
import * as ghFiles from "../github/github-files";
```
(If `config` is already imported, skip; reuse the existing import.)

- [ ] **Step 2: Add methods to the ControlPlane class**

Add inside the class (mirror how existing methods fetch a project via the store; replace `this.store.getProject` with the actual accessor this class already uses for `getEnv`/`getLogs`):
```ts
/** null = project not found; {error} = caller-fixable; else data. */
async listProjectFiles(
  projectId: string,
  ref?: string,
): Promise<{ files: ghFiles.FileNode[] } | { error: "no-repo" } | null> {
  const project = await this.store.getProject(projectId);
  if (!project) return null;
  const repo = ghFiles.parseRepo(project.repoUrl ?? "");
  if (!repo) return { error: "no-repo" };
  const branch = ref || (await ghFiles.getDefaultBranch(repo, config.githubToken));
  return { files: await ghFiles.listTree(repo, branch, config.githubToken) };
}

async readProjectFile(
  projectId: string,
  path: string,
  ref?: string,
): Promise<ghFiles.FileContent | { error: "no-repo" } | null> {
  const project = await this.store.getProject(projectId);
  if (!project) return null;
  const repo = ghFiles.parseRepo(project.repoUrl ?? "");
  if (!repo) return { error: "no-repo" };
  const branch = ref || (await ghFiles.getDefaultBranch(repo, config.githubToken));
  return ghFiles.readFile(repo, path, branch, config.githubToken);
}

async writeProjectFile(
  projectId: string,
  input: { path: string; content: string; sha?: string; message?: string },
): Promise<{ commitSha: string; sha: string } | { error: "no-repo" | "no-token" } | null> {
  const project = await this.store.getProject(projectId);
  if (!project) return null;
  const repo = ghFiles.parseRepo(project.repoUrl ?? "");
  if (!repo) return { error: "no-repo" };
  if (!config.githubToken) return { error: "no-token" };
  const branch = await ghFiles.getDefaultBranch(repo, config.githubToken);
  return ghFiles.writeFile(repo, { ...input, branch }, config.githubToken);
}

async deleteProjectFile(
  projectId: string,
  input: { path: string; sha: string; message?: string },
): Promise<{ commitSha: string } | { error: "no-repo" | "no-token" } | null> {
  const project = await this.store.getProject(projectId);
  if (!project) return null;
  const repo = ghFiles.parseRepo(project.repoUrl ?? "");
  if (!repo) return { error: "no-repo" };
  if (!config.githubToken) return { error: "no-token" };
  const branch = await ghFiles.getDefaultBranch(repo, config.githubToken);
  return ghFiles.deleteFile(repo, { ...input, branch }, config.githubToken);
}
```

> **Before writing:** open `src/core/control-plane.ts`, find an existing method like `getEnv(projectId)` and copy its exact project-lookup call (e.g. `this.store.getProject(projectId)` vs `this.store.findProject(...)`). Use that same accessor in all four methods above.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/control-plane.ts
git commit -m "feat(files): control-plane file read/write methods"
```

---

### Task 4: Control-plane routes

**Files:**
- Modify: `src/index.ts` (add after the `/v1/projects/:id/env` block, ~line 922)

- [ ] **Step 1: Add a zod schema near the other request schemas**

Find where `setEnvSchema` is declared and add beside it:
```ts
const writeFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  sha: z.string().optional(),
  message: z.string().optional(),
});
```

- [ ] **Step 2: Add the four routes**

```ts
// ---- Project files (GitHub-backed) ----
app.get("/v1/projects/:id/files", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { ref } = request.query as { ref?: string };
  if (!(await assertProjectAccess(request, reply, id))) return;
  const result = await cp.listProjectFiles(id, ref);
  if (result === null) return reply.code(404).send({ error: "project not found" });
  if ("error" in result) return reply.code(409).send({ error: result.error });
  return result;
});

app.get("/v1/projects/:id/files/content", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { path, ref } = request.query as { path?: string; ref?: string };
  if (!path) return reply.code(400).send({ error: "path required" });
  if (!(await assertProjectAccess(request, reply, id))) return;
  const result = await cp.readProjectFile(id, path, ref);
  if (result === null) return reply.code(404).send({ error: "project not found" });
  if ("error" in result) return reply.code(409).send({ error: result.error });
  return result;
});

app.put("/v1/projects/:id/files/content", async (request, reply) => {
  const { id } = request.params as { id: string };
  const parsed = writeFileSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
  if (!(await assertProjectAccess(request, reply, id))) return;
  try {
    const result = await cp.writeProjectFile(id, parsed.data);
    if (result === null) return reply.code(404).send({ error: "project not found" });
    if ("error" in result) return reply.code(409).send({ error: result.error });
    return result;
  } catch (err) {
    const status = (err as { status?: number }).status ?? 502;
    return reply.code(status).send({ error: (err as Error).message });
  }
});

app.delete("/v1/projects/:id/files/content", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { path, sha } = request.query as { path?: string; sha?: string };
  if (!path || !sha) return reply.code(400).send({ error: "path and sha required" });
  if (!(await assertProjectAccess(request, reply, id))) return;
  try {
    const result = await cp.deleteProjectFile(id, { path, sha });
    if (result === null) return reply.code(404).send({ error: "project not found" });
    if ("error" in result) return reply.code(409).send({ error: result.error });
    return result;
  } catch (err) {
    const status = (err as { status?: number }).status ?? 502;
    return reply.code(status).send({ error: (err as Error).message });
  }
});
```

> Note: `409` is reused for `no-repo`/`no-token`/stale-sha so the console can show a single "can't write — reconnect repo / file changed" path. The console maps the `error` string to the right message.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat(files): expose /v1/projects/:id/files routes"
```

---

## PHASE 2 — Console: API client

### Task 5: File types + `builderApi` file methods

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add exported types near the other `Api*` types**

```ts
export interface ApiFileNode {
  path: string;
  type: "blob" | "tree";
  sha: string;
}
export interface ApiFileContent {
  content: string;
  sha: string;
  encoding: "utf-8";
}
```

- [ ] **Step 2: Add methods to the `builderApi` object (line ~2559)**

```ts
  getProjectFiles: (projectId: string, ref?: string) =>
    request<{ files: ApiFileNode[] }>(
      `/projects/${encodeURIComponent(projectId)}/files${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
    ),

  getProjectFileContent: (projectId: string, path: string, ref?: string) =>
    request<ApiFileContent>(
      `/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(path)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }`,
    ),

  putProjectFile: (
    projectId: string,
    input: { path: string; content: string; sha?: string; message?: string },
  ) =>
    request<{ commitSha: string; sha: string }>(
      `/projects/${encodeURIComponent(projectId)}/files/content`,
      { method: "PUT", body: JSON.stringify(input) },
    ),

  deleteProjectFile: (projectId: string, path: string, sha: string) =>
    request<{ commitSha: string }>(
      `/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(
        path,
      )}&sha=${encodeURIComponent(sha)}`,
      { method: "DELETE" },
    ),
```

- [ ] **Step 3: Verify `getProjectInstances` + `getProjectMetrics` exist (Brain readout needs them)**

Run: `grep -nE "getProjectInstances|getProjectMetrics" src/lib/api.ts`
- If BOTH present: continue.
- If missing, add to `builderApi` (matching the CP routes from Phase 1 context):
```ts
  getProjectInstances: (projectId: string) =>
    request<{ instances: { id: string; status: string; cpuPct?: number }[] }>(
      `/projects/${encodeURIComponent(projectId)}/instances`,
    ),
  getProjectMetrics: (projectId: string) =>
    request<{ samples: { cpuPct: number; memPct: number; rps: number; at: string }[] }>(
      `/projects/${encodeURIComponent(projectId)}/metrics`,
    ),
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(workspace): file API client methods"
```

---

## PHASE 3 — Console: shell skeleton

### Task 6: Install CodeMirror

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install**

Run:
```bash
npm install @uiw/react-codemirror @codemirror/lang-javascript @codemirror/lang-html @codemirror/lang-css @codemirror/lang-json @codemirror/view @codemirror/state
```
Expected: packages added to `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add CodeMirror 6 editor deps"
```

---

### Task 7: Reusable `<Splitter>`

**Files:**
- Create: `src/components/workspace/Splitter.tsx`

Generalize the existing `ProjectWorkspace.startResize` (a left-drag handle that shrinks a right rail) into a handle that resizes the panel on a chosen side.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useCallback, useRef } from "react";

interface Props {
  /** Which side the controlled panel is on, relative to this handle. */
  side: "left" | "right";
  width: number;
  min: number;
  max: number;
  defaultWidth: number;
  onChange: (w: number) => void;
}

/** A 12px-wide vertical drag handle. Mirrors ProjectWorkspace's pointer-
 *  capture resizer; double-click resets to defaultWidth. */
export default function Splitter({ side, width, min, max, defaultWidth, onChange }: Props) {
  const widthRef = useRef(width);
  widthRef.current = width;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = widthRef.current;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        // dragging toward the panel shrinks it: left panel grows with +delta,
        // right panel grows with -delta.
        const next = side === "left" ? startW + delta : startW - delta;
        onChange(Math.min(max, Math.max(min, next)));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        el.releasePointerCapture?.(e.pointerId);
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      document.body.style.userSelect = "none";
    },
    [side, min, max, onChange],
  );

  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={() => onChange(defaultWidth)}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize · double-click to reset"
      className="hidden lg:flex w-3 shrink-0 cursor-col-resize items-center justify-center group"
    >
      <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-ember" />
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/Splitter.tsx
git commit -m "feat(workspace): reusable Splitter handle"
```

---

### Task 8: Expose `collapse()` on the nav context

**Files:**
- Modify: `src/components/ConsoleShell.tsx`

The workspace must force the global sidebar collapsed on mount. `toggleCollapsed` only flips; add a deterministic setter.

- [ ] **Step 1: Extend the `NavState` type**

In `src/components/ConsoleShell.tsx`, add to `type NavState`:
```ts
  /** Force the desktop sidebar into the collapsed state. */
  collapse: () => void;
```
And to the default context object:
```ts
  collapse: () => {},
```

- [ ] **Step 2: Implement `collapse` and add to the provided ctx**

After `toggleCollapsed`:
```ts
  const collapse = useCallback(() => {
    setCollapsed(true);
    try {
      window.localStorage.setItem("cantila:nav-collapsed", "1");
    } catch {
      /* ignore */
    }
  }, []);
```
Add `collapse,` to the `ctx: NavState = { ... }` object.

- [ ] **Step 3: Typecheck via build of the file (lint)**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConsoleShell.tsx
git commit -m "feat(workspace): nav context collapse() setter"
```

---

## PHASE 4 — Console: file-tree + editor

### Task 9: `ProjectFileTree` — read + browse

**Files:**
- Create: `src/components/workspace/ProjectFileTree.tsx`

- [ ] **Step 1: Build the tree model + viewer (read first)**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, File as FileIcon, Loader2, FolderClosed } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { builderApi, type ApiFileNode, type ApiFileContent, ApiError } from "../../lib/api";
import { cx } from "../ui";

/** Build a nested folder map from the flat recursive tree. */
interface TreeNode {
  name: string;
  path: string;
  type: "blob" | "tree";
  children: TreeNode[];
}
function buildTree(flat: ApiFileNode[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "tree", children: [] };
  const dirs = new Map<string, TreeNode>([["", root]]);
  for (const node of [...flat].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = node.path.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parent = dirs.get(parentPath) ?? root;
    const tn: TreeNode = { name, path: node.path, type: node.type, children: [] };
    parent.children.push(tn);
    if (node.type === "tree") dirs.set(node.path, tn);
  }
  return root.children;
}

function langFor(path: string) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(path)) return [javascript({ jsx: true, typescript: true })];
  if (/\.html?$/.test(path)) return [html()];
  if (/\.css$/.test(path)) return [css()];
  if (/\.json$/.test(path)) return [json()];
  return [];
}

export default function ProjectFileTree({ projectId }: { projectId: string }) {
  const [flat, setFlat] = useState<ApiFileNode[] | null>(null);
  const [noRepo, setNoRepo] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<ApiFileContent | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    let alive = true;
    builderApi
      .getProjectFiles(projectId)
      .then((r) => alive && setFlat(r.files))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 409) setNoRepo(true);
        setFlat([]);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const tree = useMemo(() => (flat ? buildTree(flat) : []), [flat]);

  const openFile = useCallback(
    async (path: string) => {
      setSelected(path);
      setLoadingFile(true);
      try {
        const c = await builderApi.getProjectFileContent(projectId, path);
        setFile(c);
        setDraft(c.content);
      } finally {
        setLoadingFile(false);
      }
    },
    [projectId],
  );

  const dirty = file !== null && draft !== file.content;

  if (flat === null) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
      </div>
    );
  }
  if (noRepo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-ink-dim">
        <FolderClosed className="h-6 w-6 text-ink-faint" />
        No repo connected — files appear here once a repo is connected via MCP.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        <TreeView
          nodes={tree}
          depth={0}
          open={open}
          selected={selected}
          onToggle={(p) =>
            setOpen((s) => {
              const n = new Set(s);
              n.has(p) ? n.delete(p) : n.add(p);
              return n;
            })
          }
          onOpenFile={openFile}
        />
      </div>
      <div className="h-1 shrink-0 bg-border" />
      <div className="flex min-h-0 flex-[1.4] flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-2xs text-ink-dim">
          {selected ? (
            <>
              <FileIcon className="h-3.5 w-3.5" />
              <span className="truncate">{selected}</span>
              {dirty && <span className="h-1.5 w-1.5 rounded-full bg-ember" title="unsaved" />}
            </>
          ) : (
            <span>Select a file</span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loadingFile ? (
            <div className="flex items-center gap-2 p-3 text-sm text-ink-faint">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening…
            </div>
          ) : selected ? (
            <CodeMirror
              value={draft}
              extensions={langFor(selected)}
              onChange={setDraft}
              theme="dark"
              height="100%"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TreeView({
  nodes,
  depth,
  open,
  selected,
  onToggle,
  onOpenFile,
}: {
  nodes: TreeNode[];
  depth: number;
  open: Set<string>;
  selected: string | null;
  onToggle: (p: string) => void;
  onOpenFile: (p: string) => void;
}) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          <button
            onClick={() => (n.type === "tree" ? onToggle(n.path) : onOpenFile(n.path))}
            style={{ paddingLeft: depth * 12 + 4 }}
            className={cx(
              "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-surface-2",
              selected === n.path && "bg-surface-2 text-ink",
            )}
          >
            {n.type === "tree" ? (
              open.has(n.path) ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )
            ) : (
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
            )}
            <span className="truncate">{n.name}</span>
          </button>
          {n.type === "tree" && open.has(n.path) && (
            <TreeView
              nodes={n.children}
              depth={depth + 1}
              open={open}
              selected={selected}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint`
Expected: no new errors. (Build is exercised in Task 13.)

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/ProjectFileTree.tsx
git commit -m "feat(workspace): file-tree + read-only viewer"
```

---

### Task 10: `ProjectFileTree` — save (commit to GitHub)

**Files:**
- Modify: `src/components/workspace/ProjectFileTree.tsx`

- [ ] **Step 1: Add save handler + keyboard shortcut + Save button**

Add inside the component (after `dirty`):
```tsx
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!file || !selected || !dirty) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await builderApi.putProjectFile(projectId, {
        path: selected,
        content: draft,
        sha: file.sha,
      });
      setFile({ content: draft, sha: res.sha, encoding: "utf-8" });
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? "Can't save — file changed upstream or repo not writable. Reload the file."
          : e instanceof Error
            ? e.message
            : "save failed";
      setSaveErr(msg);
    } finally {
      setSaving(false);
    }
  }, [file, selected, dirty, draft, projectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);
```

- [ ] **Step 2: Add a Save button + error line to the file header**

Replace the file header `<div className="flex items-center gap-2 border-b …">` block's right side by appending, after the `{dirty && …}` dot:
```tsx
              <button
                onClick={() => void save()}
                disabled={!dirty || saving}
                className="ml-auto inline-flex h-6 items-center gap-1 rounded bg-ember px-2 text-2xs font-semibold text-[#1a0e08] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
```
And under the header, render the error when present:
```tsx
        {saveErr && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-3 py-1 text-2xs text-red-300">
            {saveErr}
          </div>
        )}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/ProjectFileTree.tsx
git commit -m "feat(workspace): edit + save (commit to GitHub)"
```

---

## PHASE 5 — Console: preview column

### Task 11: `LivePreview` (web/mobile)

**Files:**
- Create: `src/components/workspace/LivePreview.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Monitor, Smartphone, RefreshCw, ExternalLink } from "lucide-react";
import { cx } from "../ui";

export default function LivePreview({ url }: { url: string | null }) {
  const [mode, setMode] = useState<"web" | "mobile">("web");
  const [nonce, setNonce] = useState(0);

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-dim">
        Not deployed yet — the live preview appears once a domain resolves.
      </div>
    );
  }

  const frame = (
    <iframe
      key={nonce}
      src={url}
      title="Live preview"
      className="h-full w-full border-0 bg-white"
    />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <button
          onClick={() => setMode("web")}
          title="Web"
          className={cx("rounded p-1", mode === "web" ? "bg-surface-2 text-ink" : "text-ink-dim")}
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setMode("mobile")}
          title="Mobile"
          className={cx("rounded p-1", mode === "mobile" ? "bg-surface-2 text-ink" : "text-ink-dim")}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setNonce((n) => n + 1)} title="Refresh" className="ml-auto rounded p-1 text-ink-dim hover:text-ink">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a href={url} target="_blank" rel="noreferrer" title="Open" className="rounded p-1 text-ink-dim hover:text-ink">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-bg">
        {mode === "web" ? (
          frame
        ) : (
          <div className="flex h-full items-start justify-center p-4">
            <div className="h-[680px] w-[360px] overflow-hidden rounded-[2rem] border-4 border-ink/40 bg-white shadow-lift">
              {frame}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → no new errors.
```bash
git add src/components/workspace/LivePreview.tsx
git commit -m "feat(workspace): live web/mobile preview"
```

---

### Task 12: `PreviewColumn` (preview + tabs)

**Files:**
- Create: `src/components/workspace/PreviewColumn.tsx`

Reuse existing panels. Tabs: Deploys / Env / Domains / Brain.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Rocket, KeyRound, Globe, Brain } from "lucide-react";
import type { ApiProjectDetail } from "../../lib/api";
import { cx } from "../ui";
import LivePreview from "./LivePreview";
import ProjectDeploysPanel from "../ProjectDeploysPanel";
import ProjectEnvPanel from "../ProjectEnvPanel";
import ProjectDomainsPanel from "../ProjectDomainsPanel";
import ProjectBrainPanel from "../ProjectBrainPanel";

type Tab = "deploys" | "env" | "domains" | "brain";
const TABS: { key: Tab; label: string; icon: typeof Rocket }[] = [
  { key: "deploys", label: "Deploys", icon: Rocket },
  { key: "env", label: "Env", icon: KeyRound },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "brain", label: "Brain", icon: Brain },
];

export default function PreviewColumn({
  detail,
  liveUrl,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  liveUrl: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("deploys");
  const projectId = detail.project.id;
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        <LivePreview url={liveUrl} />
      </div>
      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-2xs font-medium",
              tab === key ? "bg-bg text-ink shadow-sm" : "text-ink-dim hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {tab === "deploys" && <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />}
        {tab === "env" && <ProjectEnvPanel projectId={projectId} />}
        {tab === "domains" && <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />}
        {tab === "brain" && <ProjectBrainPanel projectId={projectId} />}
      </div>
    </div>
  );
}
```

> Confirm prop shapes by opening `ProjectDeploysPanel`, `ProjectEnvPanel`, `ProjectDomainsPanel` — they're used identically in the current `ProjectWorkspace.RailContent`, so the props above match. Adjust only if a panel's signature differs.

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → no new errors.
```bash
git add src/components/workspace/PreviewColumn.tsx
git commit -m "feat(workspace): preview column with ops tabs"
```

---

## PHASE 6 — Console: Brain autoscale + logs

### Task 13: Extend `ProjectBrainPanel` with compute readout + logs

**Files:**
- Modify: `src/components/ProjectBrainPanel.tsx`

- [ ] **Step 1: Add a read-only Compute (autoscale) section**

At the top of the component, add state + load (alongside the existing brain load):
```tsx
  const [instances, setInstances] = useState<{ id: string; status: string }[] | null>(null);
  const [load, setLoad] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void builderApi
      .getProjectInstances(projectId)
      .then((r) => alive && setInstances(r.instances))
      .catch(() => {});
    void builderApi
      .getProjectMetrics(projectId)
      .then((r) => {
        if (!alive || !r.samples.length) return;
        setLoad(r.samples[r.samples.length - 1].cpuPct);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [projectId]);
```

Render a section after the memory summary block:
```tsx
      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
        <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-ink-dim">
          <Cpu className="h-3.5 w-3.5 text-ember" /> Compute · autoscale
        </div>
        <div className="flex items-center gap-4 text-sm text-ink">
          <span>{instances ? `${instances.length} instance${instances.length === 1 ? "" : "s"}` : "—"}</span>
          <span className="text-ink-dim">·</span>
          <span>{load != null ? `${Math.round(load)}% load` : "load —"}</span>
          <span className="ml-auto rounded bg-bg px-1.5 py-0.5 text-2xs text-ink-dim">auto</span>
        </div>
      </div>
```
Add `Cpu` to the lucide import and `builderApi` is already imported.

- [ ] **Step 2: Fold the Logs panel in below compute**

```tsx
import ProjectLogsPanel from "./ProjectLogsPanel";
```
At the end of the returned JSX (before the closing wrapper):
```tsx
      <div className="mt-4">
        <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-dim">Logs</div>
        <ProjectLogsPanel projectId={projectId} />
      </div>
```

- [ ] **Step 3: Lint + commit**

Run: `npm run lint` → no new errors.
```bash
git add src/components/ProjectBrainPanel.tsx
git commit -m "feat(workspace): brain compute readout + logs"
```

---

## PHASE 7 — Console: assemble the shell

### Task 14: Rewrite `ProjectWorkspace` into the 4-column shell

**Files:**
- Modify: `src/components/ProjectWorkspace.tsx`

- [ ] **Step 1: Replace tab/rail state with two splitter widths + settings modal state**

Replace the rail width constants/state and `Tab` type with:
```tsx
import Splitter from "./workspace/Splitter";
import ProjectFileTree from "./workspace/ProjectFileTree";
import PreviewColumn from "./workspace/PreviewColumn";
import ProjectSettingsPanel from "./ProjectSettingsPanel";
import { useNavDrawer } from "./ConsoleShell";
import { ExternalLink, Loader2, AlertCircle, Settings } from "lucide-react";

const TREE_DEFAULT = 280, TREE_MIN = 200, TREE_MAX = 480, TREE_KEY = "cantila:workspace-tree-w";
const PREVIEW_DEFAULT = 480, PREVIEW_MIN = 360, PREVIEW_MAX = 820, PREVIEW_KEY = "cantila:workspace-preview-w";
```
Add state:
```tsx
  const { collapse } = useNavDrawer();
  useEffect(() => { collapse(); }, [collapse]);

  const [treeW, setTreeW] = useState(TREE_DEFAULT);
  const [previewW, setPreviewW] = useState(PREVIEW_DEFAULT);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    try {
      const t = Number(window.localStorage.getItem(TREE_KEY));
      if (!Number.isNaN(t) && t) setTreeW(Math.min(TREE_MAX, Math.max(TREE_MIN, t)));
      const p = Number(window.localStorage.getItem(PREVIEW_KEY));
      if (!Number.isNaN(p) && p) setPreviewW(Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, p)));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { window.localStorage.setItem(TREE_KEY, String(treeW)); } catch {} }, [treeW]);
  useEffect(() => { try { window.localStorage.setItem(PREVIEW_KEY, String(previewW)); } catch {} }, [previewW]);
```
Delete the old `railW`/`startResize`/`RAIL_*` code and the `RightTabs`/`RailContent` helpers + the `Tab` union + the now-unused panel imports (`ProjectOverviewPanel`, `ProjectAssetGallery`, `ProjectLogsPanel`, `ProjectDeploysPanel`, `ProjectEnvPanel`, `ProjectDomainsPanel`, `ProjectBrainPanel` — these now live inside `PreviewColumn`).

- [ ] **Step 2: Replace the return JSX (the `lg` body) with the 4-column shell + slim toolbar**

Replace the whole `return ( … )` (from the header `<div>` through the mobile block) with:
```tsx
  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[600px] flex-col">
      {/* slim toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
        <span className={cx("h-2 w-2 rounded-full", project.status === "live" ? "bg-emerald-400" : "bg-ink-faint")} />
        <span className="font-display text-sm font-semibold text-ink">{project.name}</span>
        <StatusBadge status={project.status} />
        <div className="ml-auto flex items-center gap-1">
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noreferrer"
               className="inline-flex h-7 items-center gap-1 rounded-lg bg-ember px-2.5 text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          )}
          <button onClick={() => setShowSettings(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-2 hover:text-ink" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4-column body (lg+); mobile falls back to stacked tree-less chat+preview */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="min-h-0 shrink-0 overflow-hidden rounded-xl border border-border bg-surface" style={{ width: treeW }}>
          <ProjectFileTree projectId={project.id} />
        </div>
        <Splitter side="left" width={treeW} min={TREE_MIN} max={TREE_MAX} defaultWidth={TREE_DEFAULT} onChange={setTreeW} />

        <div className="flex min-h-0 flex-1 flex-col panel overflow-hidden p-0">
          <ProjectChat projectId={project.id} projectName={project.name}
                       initialBuildPrompt={initialBuildPrompt} onAssetCreated={onAssetCreated} />
        </div>
        <Splitter side="right" width={previewW} min={PREVIEW_MIN} max={PREVIEW_MAX} defaultWidth={PREVIEW_DEFAULT} onChange={setPreviewW} />

        <div className="min-h-0 shrink-0" style={{ width: previewW }}>
          <PreviewColumn detail={detail} liveUrl={liveUrl} onRefresh={() => load({ silent: true })} />
        </div>
      </div>

      {/* mobile fallback — chat over preview, no file-tree */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:hidden">
        <div className="min-h-0 flex-1 panel overflow-hidden p-0">
          <ProjectChat projectId={project.id} projectName={project.name}
                       initialBuildPrompt={initialBuildPrompt} onAssetCreated={onAssetCreated} />
        </div>
        <div className="min-h-0 flex-1">
          <PreviewColumn detail={detail} liveUrl={liveUrl} onRefresh={() => load({ silent: true })} />
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSettings(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Project settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-ink-dim hover:text-ink">✕</button>
            </div>
            <ProjectSettingsPanel detail={detail} onRefresh={() => load({ silent: true })} />
          </div>
        </div>
      )}
    </div>
  );
```
Keep the existing `error` and `!detail` early-returns unchanged. Keep `cx` and `StatusBadge` imports.

- [ ] **Step 3: Lint + full build (this is the integration gate)**

Run: `npm run lint && npm run build`
Expected: build succeeds with no type errors. Fix any unused-import or prop-mismatch errors surfaced (most likely: a removed import still referenced, or a reused panel prop name differing — correct against the actual panel signature).

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectWorkspace.tsx
git commit -m "feat(workspace): VS Code 4-column shell + slim toolbar"
```

---

### Task 15: Manual verification

- [ ] **Step 1: Run the console**

Run: `npm run dev`
Open `http://localhost:3000/@cantila/cantilahomes` (log in if needed).

- [ ] **Step 2: Verify each acceptance criterion**

- Global sidebar is collapsed to the 64px icon rail on entry.
- Four regions visible: icon rail │ file-tree │ chat │ preview.
- Dragging the two splitters resizes tree and preview; widths persist across reload; double-click resets.
- File-tree lists the connected repo (or shows the "No repo connected" empty state). Clicking a file shows its contents in the editor.
- Editing a file enables Save; `Ctrl/Cmd+S` saves; a successful save clears the dirty dot. (Use a throwaway repo/file.)
- Preview column: live iframe renders; Web/Mobile toggle swaps the phone frame; Refresh reloads.
- Preview tabs Deploys/Env/Domains/Brain all render; Brain shows the Compute (autoscale) line + Logs.
- Toolbar ⚙ opens the settings modal.

- [ ] **Step 3: Note any defects**

Record issues; fix as follow-up steps before merge. No commit if clean.

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Icon rail (collapse on mount) → Task 8 + Task 14. ✔
- Adjustable splitters w/ persistence → Task 7 + Task 14. ✔
- File-tree + editable editor (CodeMirror) → Tasks 9–10. ✔
- GitHub read/write backend → Tasks 1–4. ✔
- API client → Task 5. ✔
- Live web/mobile preview → Task 11. ✔
- Preview tabs Deploys/Env/Domains/Brain → Task 12. ✔
- Brain read-only autoscale + logs → Task 13. ✔
- Slim toolbar + Settings in ⚙ → Task 14. ✔
- Overview/Assets/standalone-Logs/Settings-tab removed → Task 14 (imports + helpers deleted). ✔
- Empty/no-repo + read-only-no-token + 409 stale-sha handling → Tasks 4, 9, 10. ✔

**Out-of-scope guardrails honored:** no Cantila-hosted store, no autoscale controls, no native-project editing — none appear in any task. ✔

**Type consistency:** `ApiFileNode`/`ApiFileContent` defined in Task 5 and consumed in Tasks 9–10; `builderApi.getProjectFiles/getProjectFileContent/putProjectFile/deleteProjectFile` signatures match between Task 5 and call sites; `parseRepo`/`FileNode`/`FileContent`/`writeFile`/`deleteFile` names consistent across Tasks 1–4; `collapse()` defined in Task 8, used in Task 14; `Splitter` props match between Task 7 and Task 14. ✔

**Known assumption to confirm during execution (Task 3, Step 2):** the exact project-lookup accessor on `ControlPlane`/store (`getProject` vs other) — copied from an existing method at write time.
