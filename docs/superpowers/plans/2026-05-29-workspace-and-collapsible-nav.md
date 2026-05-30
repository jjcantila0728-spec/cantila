# Project Workspace Completion + Collapsible Main Nav — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the chat-first project workspace at `/@handle/<project>` by merging real-API operational surfaces (overview/deploys/logs/env/domains/settings) into a resizable right rail, and make the desktop console sidebar collapsed-by-default with a pinned click toggle and push animation.

**Architecture:** All UI changes, no new routes. Workstream B (sidebar) lives in `ConsoleShell.tsx` (collapse context + persistence + push) and `Sidebar.tsx` (icon-rail rendering + toggle). Workstream A (workspace) lives in `ProjectWorkspace.tsx` (resizable rail + tab strip) plus six new `Api*`-typed panel components. Every operational action uses the existing `api` object in `src/lib/api.ts`, which already proxies to the control plane with the session cookie.

**Tech Stack:** Next.js 14 (app router, client components), React 18, TailwindCSS, lucide-react. **No test runner exists** (scripts are `lint`/`build` only). Verification gates per task: `npx tsc --noEmit`, `npm run lint`, and—at the end—`npm run build` + manual browser checks. Adding a unit-test harness is out of scope (YAGNI).

**Working directory:** all paths are relative to `cantila-console/` (the git repo). Branch: `feat/workspace-and-collapsible-nav`.

---

## File Structure

**Workstream B — sidebar (global):**
- Modify `src/components/ConsoleShell.tsx` — add desktop collapse state to the nav context, persist it, animate content `padding-left` (push). New `useNavCollapse()` hook.
- Modify `src/components/Sidebar.tsx` — `Sidebar()` reads collapse state; `SidebarContent` gains a `collapsed` prop and renders an icon rail (no labels/headings/wordmark) + a toggle button.

**Workstream A — workspace:**
- Modify `src/components/ProjectWorkspace.tsx` — resizable rail (drag divider + persisted width), 8-tab horizontally-scrollable strip, `refresh()` plumbing, drop the placeholder tab.
- Create `src/components/ProjectOverviewPanel.tsx` — production deployment + services + domains + redeploy.
- Create `src/components/ProjectDeploysPanel.tsx` — deployment history + redeploy + rollback.
- Create `src/components/ProjectLogsPanel.tsx` — newest deployment's logs + refresh.
- Create `src/components/ProjectEnvPanel.tsx` — env list + add-variable modal.
- Create `src/components/ProjectDomainsPanel.tsx` — domain list + add-domain modal with DNS hint.
- Create `src/components/ProjectSettingsPanel.tsx` — vertical scale (vCPU/mem/disk) + always-on.

Each panel owns its loading/empty/error state. Panels that read project-level data take the already-loaded `detail` plus an `onRefresh` callback; panels that fetch their own data (logs, env) take `projectId`.

---

## Workstream B — Collapsible main nav

### Task B1: Add desktop collapse state to the shell

**Files:**
- Modify: `src/components/ConsoleShell.tsx`

- [ ] **Step 1: Extend the nav context type and provider**

Replace the context type, default, and the `useState(false)` block. The existing `NavDrawer` type/`NavDrawerCtx`/`useNavDrawer` stay for the mobile drawer; we add desktop-collapse fields and a `useNavCollapse` helper.

Replace lines 28–36 (the `type NavDrawer` … `useNavDrawer` block) with:

```tsx
type NavState = {
  /* mobile drawer */
  open: boolean;
  toggle: () => void;
  close: () => void;
  /* desktop collapse (lg+) */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const NavCtx = createContext<NavState>({
  open: false,
  toggle: () => {},
  close: () => {},
  collapsed: true,
  toggleCollapsed: () => {},
});

export const useNavDrawer = () => useContext(NavCtx);
export const useNavCollapse = () => useContext(NavCtx);
```

- [ ] **Step 2: Add the collapse state + persistence in `ConsoleShell`**

Add `useCallback` to the React import on lines 3–9 (so it reads `createContext, useCallback, useContext, useEffect, useState`). Then, inside `ConsoleShell`, immediately after `const [open, setOpen] = useState(false);` (line 44), insert:

```tsx
  // Desktop sidebar collapse (lg+). Default collapsed; persisted so the
  // choice survives reloads and route changes. Read after mount to avoid
  // an SSR/localStorage mismatch.
  const [collapsed, setCollapsed] = useState(true);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("cantila:nav-collapsed");
      if (v !== null) setCollapsed(v === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("cantila:nav-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
```

- [ ] **Step 3: Provide the new fields and rename the provider**

Replace the `ctx` object (lines 61–65) and the provider open tag (line 68) with:

```tsx
  const ctx: NavState = {
    open,
    toggle: () => setOpen((o) => !o),
    close: () => setOpen(false),
    collapsed,
    toggleCollapsed,
  };

  return (
    <NavCtx.Provider value={ctx}>
```

And update the closing tag on line 125 from `</NavDrawerCtx.Provider>` to `</NavCtx.Provider>`.

- [ ] **Step 4: Animate the content padding (the push)**

Replace the content wrapper `div` (lines 115–121) with:

```tsx
        {/* page content — on desktop the left padding tracks the sidebar
            width (240px expanded / 64px collapsed), animating in lockstep
            with the aside so expanding pushes the content right. On mobile
            it is pushed by the drawer width as before. */}
        <div
          className={cx(
            "relative z-10 lg:translate-x-0",
            collapsed ? "lg:pl-16" : "lg:pl-[240px]",
            "transition-[padding,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            open ? "translate-x-72" : "translate-x-0",
          )}
        >
          {children}
        </div>
```

(Note: this replaces the previous `PUSH` usage on the content wrapper with a combined `padding,transform` transition. The `PUSH` constant is still used by the mobile `<aside>`, so leave its definition on lines 40–41 untouched.)

- [ ] **Step 5: Pass collapsed into the desktop `<Sidebar />`**

Change line 78 from `<Sidebar />` to `<Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />`. (Task B2 adds these props to `Sidebar`.)

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). It will transiently complain that `Sidebar` does not accept `collapsed`/`onToggleCollapse` until B2 lands — that is expected; proceed to B2 before committing.

- [ ] **Step 7: (defer commit to end of B2 — the two files compile together)**

---

### Task B2: Render the sidebar as an icon rail when collapsed

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add the collapse icons to the import**

On the lucide-react import (lines 6–31), add `PanelLeftClose` and `PanelLeftOpen` to the list.

- [ ] **Step 2: Make `Sidebar()` accept and apply the collapse props**

Replace the `Sidebar` function (lines 96–102) with:

```tsx
export default function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={cx(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface lg:flex",
        "transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        collapsed ? "w-16" : "w-[240px]",
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  );
}
```

- [ ] **Step 3: Extend `SidebarContent`'s props**

Replace the `SidebarContent` signature (lines 108–113) with:

```tsx
export function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  /** Desktop icon-rail mode. The mobile drawer renders without this, so it
   *  defaults to the full expanded layout. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
```

- [ ] **Step 4: Brand row + collapse toggle**

Replace the brand `div` (lines 165–185) with:

```tsx
      {/* brand + collapse toggle */}
      <div
        className={cx(
          "flex h-16 items-center border-b border-border-soft",
          collapsed ? "justify-center px-2" : "gap-2.5 px-5",
        )}
      >
        {effectiveLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveLogoUrl}
            alt={`${effectiveName} logo`}
            className="h-7 w-7 rounded-md object-contain"
          />
        ) : (
          <BrandMark />
        )}
        {!collapsed && (
          <div className="leading-none">
            <div className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
              {branded?.brandDisplayName ?? "Cantila"}
            </div>
            <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-ink-faint">
              Console
            </div>
          </div>
        )}
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* expand affordance — only in collapsed rail */}
      {onToggleCollapse && collapsed && (
        <div className="px-2 pt-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex h-10 w-full items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
```

- [ ] **Step 5: Deploy CTA — icon-only when collapsed**

Replace the deploy-CTA `div` (lines 187–198) with:

```tsx
      {/* deploy CTA */}
      <div className={cx("pt-4", collapsed ? "px-2" : "px-3")}>
        <Link
          href="/chat"
          onClick={onNavigate}
          aria-label="New chat"
          title={collapsed ? "New chat" : undefined}
          className={cx(
            "group flex items-center rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-all hover:bg-ember-bright",
            collapsed ? "h-10 justify-center" : "gap-2 px-3 py-2.5",
          )}
        >
          <Rocket className="h-4 w-4" strokeWidth={2.4} />
          {!collapsed && (
            <>
              New chat
              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Link>
      </div>
```

- [ ] **Step 6: Nav — hide headings/labels when collapsed**

Replace the `nav` block (lines 200–241) with:

```tsx
      {/* nav */}
      <nav className={cx("flex-1 overflow-y-auto py-5", collapsed ? "px-2" : "px-3")}>
        {NAV.map((group) => (
          <div key={group.heading} className="mb-6 last:mb-0">
            {!collapsed && (
              <div className="px-3 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">
                {group.heading}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cx(
                        "group relative flex min-h-11 items-center rounded-lg text-sm transition-colors",
                        collapsed ? "justify-center px-0" : "gap-2.5 px-3 py-2",
                        active
                          ? "bg-surface-3 font-medium text-ink"
                          : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ember" />
                      )}
                      <Icon
                        className={cx(
                          "h-[1.05rem] w-[1.05rem] transition-colors",
                          active ? "text-ember" : "text-ink-faint group-hover:text-ink-dim",
                        )}
                        strokeWidth={2}
                      />
                      {!collapsed && item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
```

- [ ] **Step 7: Account chip — avatar-only when collapsed**

Replace the account-chip `div` (lines 243–272) with:

```tsx
      {/* account chip + sign-out */}
      <div className={cx("border-t border-border-soft", collapsed ? "p-2" : "p-3")}>
        <div className={cx("flex items-center", collapsed ? "justify-center" : "gap-1")}>
          <Link
            href="/settings"
            onClick={onNavigate}
            title={collapsed ? chipName : undefined}
            className={cx(
              "flex min-h-11 items-center rounded-lg transition-colors hover:bg-surface-2",
              collapsed ? "justify-center p-1" : "min-w-0 flex-1 gap-2.5 px-2 py-2",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim font-mono text-xs font-bold text-[#1a0e08]">
              {chipInitials}
            </span>
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium text-ink">
                  {chipName}
                </span>
                <span className="block truncate font-mono text-[0.65rem] text-ink-faint">
                  {liveAccount ? `@${chipHandle} · ${chipPlan}` : `${chipPlan} plan`}
                </span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <a
              href="/logout"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </a>
          )}
        </div>
      </div>
```

- [ ] **Step 8: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/ConsoleShell.tsx src/components/Sidebar.tsx
git commit -m "feat(console): collapsible sidebar, collapsed by default with push"
```

---

### Task B3: Manual verification of the nav

- [ ] **Step 1: Run the dev server and verify behavior**

Run: `npm run dev`, open any console page (e.g. `/dashboard`).
Expected, on a `lg`+ viewport:
1. Sidebar renders as a 64px icon rail by default; hovering a nav icon shows its label as a tooltip.
2. Clicking the expand button (`PanelLeftOpen`) widens it to 240px and the page content slides right in lockstep (push, not overlay); the collapse button (`PanelLeftClose`) reverses it.
3. Reloading the page preserves the last state; navigating between pages preserves it.
4. On a narrow viewport the mobile drawer still opens/closes from the Topbar as before (unchanged).

Record the result. If any check fails, fix before continuing.

---

## Workstream A — Project workspace

### Task A1: Resizable rail + 8-tab strip + refresh plumbing

**Files:**
- Modify: `src/components/ProjectWorkspace.tsx`

- [ ] **Step 1: Replace the imports, tab type, and resolve logic**

Replace the import block (lines 22–49) with:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Image as ImageIcon,
  Brain,
  Rocket,
  ScrollText,
  KeyRound,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import {
  builderApi,
  type ApiProjectDetail,
  type ApiProjectAsset,
} from "../lib/api";
import { cx, StatusBadge } from "./ui";
import ProjectChat from "./ProjectChat";
import ProjectAssetGallery from "./ProjectAssetGallery";
import ProjectBrainPanel from "./ProjectBrainPanel";
import ProjectOverviewPanel from "./ProjectOverviewPanel";
import ProjectDeploysPanel from "./ProjectDeploysPanel";
import ProjectLogsPanel from "./ProjectLogsPanel";
import ProjectEnvPanel from "./ProjectEnvPanel";
import ProjectDomainsPanel from "./ProjectDomainsPanel";
import ProjectSettingsPanel from "./ProjectSettingsPanel";

type Tab =
  | "overview"
  | "assets"
  | "brain"
  | "deploys"
  | "logs"
  | "env"
  | "domains"
  | "settings";

const RAIL_DEFAULT = 416; // 26rem
const RAIL_MIN = 352; // 22rem
const RAIL_MAX = 768; // 48rem
const RAIL_KEY = "cantila:workspace-rail-w";
```

- [ ] **Step 2: Replace the component body's state + resolve effect**

Replace lines 56–93 (from `const [detail, setDetail]` through the end of the `onAssetCreated` callback) with:

```tsx
  const [detail, setDetail] = useState<ApiProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [pendingAssets, setPendingAssets] = useState<ApiProjectAsset[]>([]);

  /* Resizable rail width (lg+). Read from localStorage after mount. */
  const [railW, setRailW] = useState(RAIL_DEFAULT);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(RAIL_KEY);
      if (v) {
        const n = Number(v);
        if (!Number.isNaN(n)) setRailW(Math.min(RAIL_MAX, Math.max(RAIL_MIN, n)));
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(RAIL_KEY, String(railW));
    } catch {
      /* ignore */
    }
  }, [railW]);

  const railWRef = useRef(railW);
  railWRef.current = railW;
  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = railWRef.current;
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(
        RAIL_MAX,
        Math.max(RAIL_MIN, startW - (ev.clientX - startX)),
      );
      setRailW(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
  }, []);

  /* The build prompt is stashed in sessionStorage by /chat right before
   *  the redirect — we read it once and clear it so a refresh doesn't
   *  re-kick the build. */
  const initialBuildPrompt = useMemo(() => {
    if (!isBuild || typeof window === "undefined") return undefined;
    const key = `cantila:build-prompt:${handle}:${projectName}`;
    const value = window.sessionStorage.getItem(key);
    if (value) window.sessionStorage.removeItem(key);
    return value ?? undefined;
  }, [isBuild, handle, projectName]);

  /* Resolve the project from /@handle/<name>. Exposed as `refresh` so the
   *  operational tabs can re-pull project state after a mutation. */
  const load = useCallback(async () => {
    try {
      const d = await builderApi.getProjectByHandle(handle, projectName);
      setDetail(d);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "project not found");
    }
  }, [handle, projectName]);

  useEffect(() => {
    setError(null);
    setDetail(null);
    void load();
  }, [load]);

  const onAssetCreated = useCallback((asset: ApiProjectAsset) => {
    setPendingAssets((prev) => [...prev, asset]);
  }, []);
```

(Note: the `initialBuildPrompt` memo from the original lines 64–70 is reproduced above so it is not lost in the replacement.)

- [ ] **Step 3: Replace the desktop split layout to use the resizable rail**

Replace the desktop body block (original lines 171–197 — the `div` containing the `hidden lg:flex` chat column and the `w-[26rem]` rail column) with:

```tsx
      {/* Body — split layout on desktop, tabs on mobile */}
      <div className="flex flex-1 min-h-0 gap-0">
        <div className="hidden flex-1 min-h-0 flex-col panel overflow-hidden p-0 lg:flex">
          <ProjectChat
            projectId={project.id}
            projectName={project.name}
            initialBuildPrompt={initialBuildPrompt}
            onAssetCreated={onAssetCreated}
          />
        </div>

        {/* drag handle */}
        <div
          onPointerDown={startResize}
          onDoubleClick={() => setRailW(RAIL_DEFAULT)}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize · double-click to reset"
          className="hidden lg:flex w-3 shrink-0 cursor-col-resize items-center justify-center group"
        >
          <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-ember" />
        </div>

        <div
          className="hidden shrink-0 flex-col gap-3 lg:flex"
          style={{ width: railW }}
        >
          <RightTabs tab={tab} setTab={setTab} />
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            <RailContent
              tab={tab}
              detail={detail}
              pendingAssets={pendingAssets}
              onRefresh={load}
            />
          </div>
        </div>

        {/* mobile — stacked */}
        <div className="flex flex-1 min-h-0 flex-col gap-3 lg:hidden">
          <RightTabs tab={tab} setTab={setTab} mobile />
          {tab === "chat-mobile-placeholder" ? null : null}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <RailContent
              tab={tab}
              detail={detail}
              pendingAssets={pendingAssets}
              onRefresh={load}
              mobileChat={
                <div className="flex-1 min-h-0 panel overflow-hidden p-0">
                  <ProjectChat
                    projectId={project.id}
                    projectName={project.name}
                    initialBuildPrompt={initialBuildPrompt}
                    onAssetCreated={onAssetCreated}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
```

(Remove the leftover `{tab === "chat-mobile-placeholder" ? null : null}` line — it is shown here only to mark where the old mobile chat branch was; delete it when pasting.)

- [ ] **Step 4: Replace `RightTabs` and add `RailContent`**

Replace the entire `RightTabs` function (original lines 225–256) with:

```tsx
const TAB_DEFS: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "assets", label: "Assets", icon: ImageIcon },
  { key: "brain", label: "Brain", icon: Brain },
  { key: "deploys", label: "Deploys", icon: Rocket },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "env", label: "Env", icon: KeyRound },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "settings", label: "Settings", icon: SlidersHorizontal },
];

function RightTabs({
  tab,
  setTab,
  mobile,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1">
      {TAB_DEFS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          title={label}
          className={cx(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-2xs font-medium transition-colors",
            tab === key ? "bg-bg text-ink shadow-sm" : "text-ink-dim hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className={mobile ? "" : "hidden xl:inline"}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function RailContent({
  tab,
  detail,
  pendingAssets,
  onRefresh,
  mobileChat,
}: {
  tab: Tab;
  detail: ApiProjectDetail | null;
  pendingAssets: ApiProjectAsset[];
  onRefresh: () => Promise<void>;
  mobileChat?: React.ReactNode;
}) {
  if (!detail) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }
  const projectId = detail.project.id;
  switch (tab) {
    case "overview":
      return <ProjectOverviewPanel detail={detail} onRefresh={onRefresh} />;
    case "assets":
      return mobileChat
        ? (
            <div className="space-y-3">
              {mobileChat}
              <ProjectAssetGallery projectId={projectId} initialAssets={pendingAssets} />
            </div>
          )
        : <ProjectAssetGallery projectId={projectId} initialAssets={pendingAssets} />;
    case "brain":
      return <ProjectBrainPanel projectId={projectId} />;
    case "deploys":
      return <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />;
    case "logs":
      return <ProjectLogsPanel projectId={projectId} />;
    case "env":
      return <ProjectEnvPanel projectId={projectId} />;
    case "domains":
      return <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />;
    case "settings":
      return <ProjectSettingsPanel detail={detail} onRefresh={onRefresh} />;
    default:
      return null;
  }
}
```

(The `mobileChat` slot keeps the agent chat reachable on mobile: it renders above the Overview/Assets content. Simplify: render `mobileChat` above the switch result instead of only on `assets`. Replace the `assets` case's mobile special-casing — see Step 5.)

- [ ] **Step 5: Simplify the mobile chat slot**

In `RailContent`, replace the whole `switch` with a version that renders `mobileChat` once above the panel, so the chat shows on every mobile tab:

```tsx
  const projectId = detail.project.id;
  const panel = (() => {
    switch (tab) {
      case "overview":
        return <ProjectOverviewPanel detail={detail} onRefresh={onRefresh} />;
      case "assets":
        return <ProjectAssetGallery projectId={projectId} initialAssets={pendingAssets} />;
      case "brain":
        return <ProjectBrainPanel projectId={projectId} />;
      case "deploys":
        return <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />;
      case "logs":
        return <ProjectLogsPanel projectId={projectId} />;
      case "env":
        return <ProjectEnvPanel projectId={projectId} />;
      case "domains":
        return <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />;
      case "settings":
        return <ProjectSettingsPanel detail={detail} onRefresh={onRefresh} />;
      default:
        return null;
    }
  })();
  return (
    <div className="space-y-3">
      {mobileChat}
      {panel}
    </div>
  );
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only of the form "Cannot find module './ProjectOverviewPanel'" (and the other five panels) — those are created in A2–A7. No other errors. Do not commit yet.

---

### Task A2: Overview panel

**Files:**
- Create: `src/components/ProjectOverviewPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import {
  ExternalLink,
  RotateCw,
  Database as DatabaseIcon,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { api, type ApiProjectDetail } from "../lib/api";
import { StatusBadge, Pill, cx } from "./ui";

export default function ProjectOverviewPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project, services, deployments, domains } = detail;
  const live = deployments.find((d) => d.status === "live") ?? deployments[0];
  const primary = domains.find((d) => d.primary) ?? domains[0];
  const liveUrl = primary ? `https://${primary.hostname}` : undefined;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function redeploy() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await api.deploy(project.id);
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "redeploy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        )}
        <button
          onClick={redeploy}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
        >
          <RotateCw className={cx("h-3.5 w-3.5", busy && "animate-spin")} />
          {busy ? "Deploying…" : "Redeploy"}
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-ink">
            Production deployment
          </h3>
          {live && <StatusBadge status={live.status} />}
        </div>
        {live ? (
          <>
            {live.commitMessage && (
              <p className="text-sm text-ink">{live.commitMessage}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-y-3">
              <Cell k="Commit" v={live.commitHash ?? "—"} mono />
              <Cell k="Branch" v={live.branch ?? "—"} mono />
              <Cell k="Trigger" v={live.trigger} />
              <Cell k="Runtime" v={live.runtime} />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-faint">No deployments yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">
          Linked services
        </h3>
        <div className="space-y-2.5">
          <ServiceRow
            icon={Globe}
            title={primary?.hostname ?? `${project.slug}.cantila.app`}
            sub={primary ? "Domain · SSL " + (primary.sslActive ? "active" : "issuing") : "Default subdomain"}
            tone="info"
          />
          {services.database && (
            <ServiceRow
              icon={DatabaseIcon}
              title={`${services.database.engine} ${services.database.version}`}
              sub={`Database · ${services.database.status}`}
              tone="violet"
            />
          )}
          {services.mailbox && (
            <ServiceRow
              icon={Mail}
              title={services.mailbox.address}
              sub={`Mailbox · ${services.mailbox.status}`}
              tone="info"
            />
          )}
          {services.phoneNumber && (
            <ServiceRow
              icon={Phone}
              title={services.phoneNumber.e164}
              sub={`Number · ${services.phoneNumber.status}`}
              tone="info"
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Pill tone={project.alwaysOn ? "live" : "neutral"}>
          {project.alwaysOn ? "Always-on" : "Scales to zero"}
        </Pill>
        <Pill tone="neutral">{`${project.vcpu} vCPU`}</Pill>
        <Pill tone="neutral">{`${project.memoryMb / 1024} GB`}</Pill>
        <Pill tone="neutral">{project.region}</Pill>
      </div>
    </div>
  );
}

function Cell({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="kv">{k}</div>
      <div className={cx("mt-0.5 text-sm text-ink", mono && "font-mono text-xs")}>
        {v}
      </div>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  title,
  sub,
  tone,
}: {
  icon: typeof Globe;
  title: string;
  sub: string;
  tone: "info" | "violet";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border-soft bg-surface px-3 py-2.5">
      <Icon className={cx("h-4 w-4", tone === "violet" ? "text-violet" : "text-info")} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-xs text-ink">{title}</div>
        <div className="text-2xs text-ink-faint">{sub}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: the `./ProjectOverviewPanel` error is gone; remaining errors are only the other five missing panels.

---

### Task A3: Deploys panel

**Files:**
- Create: `src/components/ProjectDeploysPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { RotateCw, Undo2, GitCommitHorizontal } from "lucide-react";
import { api, type ApiProjectDetail, type ApiDeployment } from "../lib/api";
import { StatusBadge, cx } from "./ui";

export default function ProjectDeploysPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project, deployments } = detail;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(label);
    setErr(null);
    try {
      await fn();
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">
          Deployments
        </h3>
        <button
          onClick={() => run("deploy", () => api.deploy(project.id))}
          disabled={busy !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
        >
          <RotateCw className={cx("h-3.5 w-3.5", busy === "deploy" && "animate-spin")} />
          Redeploy
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {deployments.length === 0 ? (
        <p className="text-sm text-ink-faint">No deployments yet.</p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {deployments.map((d: ApiDeployment) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <GitCommitHorizontal className="h-4 w-4 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-ink">
                  {d.commitMessage ?? d.id}
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-2xs text-ink-faint">
                  {d.commitHash && <span>{d.commitHash.slice(0, 7)}</span>}
                  <span>· {d.trigger}</span>
                  {d.branch && <span>· {d.branch}</span>}
                </div>
              </div>
              <StatusBadge status={d.status} />
              {d.status !== "live" && (
                <button
                  onClick={() => run(d.id, () => api.rollback(project.id, d.id))}
                  disabled={busy !== null}
                  title="Roll back to this deployment"
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
                >
                  <Undo2 className={cx("h-3 w-3", busy === d.id && "animate-spin")} />
                  Rollback
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: the `./ProjectDeploysPanel` error is gone.

---

### Task A4: Logs panel

**Files:**
- Create: `src/components/ProjectLogsPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, cx as _cx } from "../lib/api";
import { cx } from "./ui";

export default function ProjectLogsPanel({ projectId }: { projectId: string }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.getLogs(projectId);
      const newest = res.deployments[0];
      setLines(newest ? newest.logs : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not load logs");
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Logs</h3>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
        >
          <RefreshCw className={cx("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}
      <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-bg p-3 font-mono text-2xs leading-relaxed text-ink-dim">
        {lines === null
          ? "Loading…"
          : lines.length === 0
            ? "No logs for the latest deployment yet."
            : lines.join("\n")}
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Remove the bad import**

The import `import { api, cx as _cx } from "../lib/api";` is wrong — `cx` lives in `./ui`, and `api.ts` does not export `cx`. Fix the import block to exactly:

```tsx
import { api } from "../lib/api";
import { cx } from "./ui";
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: the `./ProjectLogsPanel` error is gone.

---

### Task A5: Environment panel

**Files:**
- Create: `src/components/ProjectEnvPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Lock, Loader2 } from "lucide-react";
import { api, type ApiEnvVar } from "../lib/api";
import { Pill, Button, cx } from "./ui";
import Modal, { Field, inputClass } from "./Modal";

export default function ProjectEnvPanel({ projectId }: { projectId: string }) {
  const [vars, setVars] = useState<ApiEnvVar[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    key: string;
    value: string;
    scope: ApiEnvVar["scope"];
    secret: boolean;
  }>({ key: "", value: "", scope: "all", secret: true });

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api.listEnv(projectId);
      setVars(res.env);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not load env");
      setVars([]);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addVar() {
    const key = form.key.trim();
    if (!key || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.setEnv(projectId, {
        key,
        value: form.value,
        secret: form.secret,
        scope: form.scope,
      });
      setForm({ key: "", value: "", scope: "all", secret: true });
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not save variable");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">
            Environment & secrets
          </h3>
          <p className="mt-0.5 text-2xs text-ink-faint">
            Encrypted at rest · applied on next deploy
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {vars === null ? (
        <div className="flex items-center gap-2 text-sm text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : vars.length === 0 ? (
        <p className="text-sm text-ink-faint">No variables set.</p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {vars.map((e) => (
            <li key={e.key} className="flex items-center gap-2 px-3 py-2.5">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-xs font-medium text-ink">
                {e.secret && <Lock className="h-3 w-3 shrink-0 text-ember" />}
                <span className="truncate">{e.key}</span>
              </span>
              <span className="truncate font-mono text-2xs text-ink-dim">
                {e.secret ? "••••••••" : e.value || "(empty)"}
              </span>
              <Pill tone={e.scope === "production" ? "ember" : "neutral"}>
                {e.scope}
              </Pill>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add environment variable"
        description="Scoped, encrypted at rest, applied on next deploy."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addVar} disabled={!form.key.trim() || saving}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {saving ? "Saving…" : "Add variable"}
            </Button>
          </>
        }
      >
        <Field label="Key">
          <input
            autoFocus
            value={form.key}
            onChange={(ev) => setForm({ ...form, key: ev.target.value.toUpperCase() })}
            placeholder="DATABASE_URL"
            className={cx(inputClass, "font-mono")}
          />
        </Field>
        <Field label="Value">
          <input
            value={form.value}
            onChange={(ev) => setForm({ ...form, value: ev.target.value })}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") void addVar();
            }}
            placeholder="postgres://…"
            className={cx(inputClass, "font-mono")}
          />
        </Field>
        <Field label="Scope">
          <select
            value={form.scope}
            onChange={(ev) =>
              setForm({ ...form, scope: ev.target.value as ApiEnvVar["scope"] })
            }
            className={inputClass}
          >
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="preview">Preview</option>
          </select>
        </Field>
        <label className="flex items-center justify-between">
          <span>
            <span className="kv">Secret</span>
            <span className="mt-0.5 block text-2xs text-ink-faint">
              Mask the value in the UI and logs.
            </span>
          </span>
          <input
            type="checkbox"
            checked={form.secret}
            onChange={() => setForm({ ...form, secret: !form.secret })}
            className="h-4 w-4 accent-ember"
          />
        </label>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: the `./ProjectEnvPanel` error is gone. If `Button` is not exported from `./ui`, see Task A8 Step 1 (fallback to a plain button); otherwise proceed.

---

### Task A6: Domains panel

**Files:**
- Create: `src/components/ProjectDomainsPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { Plus, Globe, Lock, Link2 } from "lucide-react";
import { api, type ApiProjectDetail } from "../lib/api";
import { Pill, Button, cx } from "./ui";
import Modal, { Field, inputClass } from "./Modal";

export default function ProjectDomainsPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project, domains } = detail;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dnsHint, setDnsHint] = useState<{ type: string; name: string; value: string } | null>(
    null,
  );

  async function addDomain() {
    const hostname = name.trim().toLowerCase().replace(/\s+/g, "");
    if (!hostname || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await api.addDomain(project.id, hostname);
      setDnsHint(res.dns);
      setName("");
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not add domain");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Domains</h3>
        <button
          onClick={() => {
            setDnsHint(null);
            setOpen(true);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {domains.length === 0 ? (
        <p className="text-sm text-ink-faint">No domains attached.</p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <Globe className="h-4 w-4 shrink-0 text-info" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-ink">
                    {d.hostname}
                  </span>
                  {d.primary && <Pill tone="ember">Primary</Pill>}
                </div>
                <div className="mt-0.5 text-2xs text-ink-faint">
                  {d.kind === "subdomain" ? "Cantila subdomain" : "Custom domain"}
                </div>
              </div>
              <Pill tone={d.sslActive ? "live" : "warn"}>
                <Lock className="h-3 w-3" />
                {d.sslActive ? "SSL active" : "SSL issuing"}
              </Pill>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a domain"
        description="Cantila issues SSL and wires DNS automatically."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={addDomain} disabled={!name.trim() || saving}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {saving ? "Adding…" : "Add domain"}
            </Button>
          </>
        }
      >
        <Field label="Domain">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addDomain();
            }}
            placeholder="app.example.com"
            className={inputClass}
          />
        </Field>
        {dnsHint && (
          <div className="flex items-start gap-2 rounded-lg border border-border-soft bg-surface-2 p-3 text-2xs">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
            <div className="font-mono leading-relaxed text-ink-dim">
              <div>Add this DNS record at your registrar:</div>
              <div className="mt-1 text-ink">
                {dnsHint.type} {dnsHint.name} → {dnsHint.value}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: the `./ProjectDomainsPanel` error is gone.

---

### Task A7: Settings panel

**Files:**
- Create: `src/components/ProjectSettingsPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { api, type ApiProjectDetail } from "../lib/api";
import { cx } from "./ui";

const VCPU = [1, 2, 4, 8];
const MEM_GB = [1, 2, 4, 8, 16];
const DISK_GB = [10, 20, 50];

export default function ProjectSettingsPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project } = detail;
  const [vcpu, setVcpu] = useState(project.vcpu);
  const [memGb, setMemGb] = useState(project.memoryMb / 1024);
  const [diskGb, setDiskGb] = useState(project.diskGb);
  const [alwaysOn, setAlwaysOn] = useState(project.alwaysOn);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const dirty =
    vcpu !== project.vcpu ||
    memGb !== project.memoryMb / 1024 ||
    diskGb !== project.diskGb ||
    alwaysOn !== project.alwaysOn;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setErr(null);
    setOk(false);
    try {
      await api.scale(project.id, {
        vcpu,
        memoryMb: memGb * 1024,
        diskGb,
        alwaysOn,
      });
      await onRefresh();
      setOk(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-ink">Compute</h3>

      <Choice label="vCPU" unit="cores" options={VCPU} value={vcpu} onChange={setVcpu} />
      <Choice label="Memory" unit="GB" options={MEM_GB} value={memGb} onChange={setMemGb} />
      <Choice label="Disk" unit="GB" options={DISK_GB} value={diskGb} onChange={setDiskGb} />

      <div className="flex items-center justify-between border-t border-border-soft pt-3">
        <div>
          <div className="text-sm text-ink">Always-on</div>
          <div className="text-2xs text-ink-faint">
            Keep one instance pinned for production traffic.
          </div>
        </div>
        <button
          onClick={() => setAlwaysOn((v) => !v)}
          role="switch"
          aria-checked={alwaysOn}
          className={cx(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
            alwaysOn ? "bg-ember" : "bg-surface-3",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-transform",
              alwaysOn ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {err && <div className="text-2xs text-down">{err}</div>}
      {ok && !dirty && <div className="text-2xs text-up">Saved.</div>}

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:cursor-default disabled:opacity-60"
      >
        <Save className="h-4 w-4" strokeWidth={2.2} />
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function Choice({
  label,
  unit,
  options,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  options: number[];
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-ink-dim">{label}</span>
        <span className="font-mono text-ink">
          {value} {unit}
        </span>
      </div>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cx(
              "h-8 flex-1 rounded-lg border text-2xs font-medium transition-colors",
              o === value
                ? "border-ember bg-ember/10 text-ink"
                : "border-border bg-surface-2 text-ink-dim hover:border-ink-faint",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS with no errors (all six panels now exist and `ProjectWorkspace` resolves all imports).

---

### Task A8: Resolve shared-primitive gaps, lint, build, commit

**Files:**
- Verify/Modify: `src/components/ui.tsx` (only if exports are missing)

- [ ] **Step 1: Confirm `ui.tsx` exports the primitives the panels use**

The panels import `StatusBadge`, `Pill`, `Button`, `cx` from `./ui`, and `Modal`, `Field`, `inputClass` from `./Modal`. `ProjectView.tsx` already imports `StatusBadge, RuntimeMark, Pill, cx, Meter, Button` from `./ui` and `Modal, { Field, inputClass }` from `./Modal`, so all exist. Confirm with:

Run: `grep -nE "export (function|const) (StatusBadge|Pill|Button|cx)" src/components/ui.tsx`
Expected: a line for each of `StatusBadge`, `Pill`, `Button`, `cx`.

If `Button` is NOT exported, replace each `<Button variant="ghost" …>…</Button>` / `<Button variant="primary" …>…</Button>` in `ProjectEnvPanel.tsx` and `ProjectDomainsPanel.tsx` with a plain button:
- ghost: `<button onClick={…} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 text-sm font-medium text-ink hover:border-ink-faint">…</button>`
- primary: `<button onClick={…} disabled={…} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:opacity-60">…</button>`
and remove `Button` from those files' `./ui` imports.

Also confirm `text-up`/`text-down` and `text-2xs`/`kv` utility classes exist (they are used throughout `ProjectView.tsx`, so they do). If `text-up` is absent, use `text-live` instead in `ProjectSettingsPanel.tsx`.

- [ ] **Step 2: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all three PASS. Fix any errors surfaced (most likely: an unused import — remove it; a class-name typo — correct it).

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectWorkspace.tsx src/components/ProjectOverviewPanel.tsx src/components/ProjectDeploysPanel.tsx src/components/ProjectLogsPanel.tsx src/components/ProjectEnvPanel.tsx src/components/ProjectDomainsPanel.tsx src/components/ProjectSettingsPanel.tsx
git commit -m "feat(workspace): resizable rail with real-API ops tabs (overview/deploys/logs/env/domains/settings)"
```

---

### Task A9: Manual verification of the workspace

- [ ] **Step 1: Verify against a real project**

Run: `npm run dev`, sign in, open `/@cantila/cantilahomes` (or any existing project under your handle).
Expected:
1. The rail shows 8 tabs (Overview default). Dragging the divider between chat and rail resizes it; the width persists across a reload; double-clicking the divider resets it.
2. **Overview** shows the production deployment, linked services, and capacity pills; **Open** and **Redeploy** work.
3. **Deploys** lists history with status badges; **Redeploy** queues a deploy and the list refreshes; **Rollback** appears on non-live rows and works.
4. **Logs** shows the newest deployment's log lines and refreshes.
5. **Env** lists variables and the add-variable modal persists a new one (re-list shows it).
6. **Domains** lists domains; add-domain shows the returned DNS hint and the list refreshes.
7. **Settings** changes vCPU/memory/disk/always-on and **Save** persists (reload shows the new values).
8. On a narrow viewport, the agent chat still renders above each tab's content.

Record the result with the actual observed behavior. If a tab errors against the live API, capture the error text and fix the offending call before declaring done.

---

## Self-Review (completed during planning)

**Spec coverage:**
- Resizable rail + persistence → A1. ✓
- Overview replaces placeholder (new default) → A1 (default tab) + A2. ✓
- Deploys/Logs/Env/Domains/Settings tabs, real API → A3–A7. ✓
- Drop placeholder "Working on it" tab → A1 (tab list no longer includes it). ✓
- Sidebar collapsed-by-default + pinned toggle + push → B1/B2. ✓
- Collapsed rendering (brand/nav/CTA/chip) → B2. ✓
- localStorage keys (`cantila:workspace-rail-w`, `cantila:nav-collapsed`) → A1/B1. ✓
- Audit hardcoded 240px offsets → only `ConsoleShell`/`Sidebar` (verified via grep); both updated in B1/B2. ✓
- Out-of-scope (Metrics, Pause/Delete, instance-health) → not implemented, by design. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete. The two intentional "fix this line" steps (A4 Step 2, A1 Step 3 cleanup) are corrections to the immediately-preceding pasted code, with exact replacements given.

**Type consistency:** Panels consistently take `detail: ApiProjectDetail` + `onRefresh: () => Promise<void>` (overview/deploys/domains/settings) or `projectId: string` (logs/env). `load`/`onRefresh` is `() => Promise<void>` everywhere. API calls match `src/lib/api.ts` signatures: `api.deploy(id)`, `api.rollback(id, deploymentId)`, `api.getLogs(id) → {deployments:[{logs}]}`, `api.listEnv(id) → {env}`, `api.setEnv(id, {...})`, `api.addDomain(id, hostname) → {dns}`, `api.scale(id, {vcpu, memoryMb, diskGb, alwaysOn})`.
