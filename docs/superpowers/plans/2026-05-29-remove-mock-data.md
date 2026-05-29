# Remove Frontend Mock Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Cantila Console renders only real control-plane data or proper empty/error states — no fabricated records anywhere — and `src/lib/mock-data.ts` is deleted.

**Architecture:** Pure helpers/constants currently living in `mock-data.ts` (`REGIONS`, `planTiers`, `activityHref`, `mailboxSlug`, `numberSlug`) move to real modules (`src/lib/constants.ts`, `src/lib/links.ts`). The `isControlPlaneLive()`-gated offline branch in ~13 API-backed views is removed so they always use `api.*` (empty list → `EmptyState`, fetch error → `ErrorState`). Mock-only record views (dashboard, mail/sms detail pages, command palette, notifications) are wired to existing `api.*` methods. Finally `mock-data.ts` is deleted and a grep guard + `next build` confirm nothing references it.

**Tech Stack:** Next.js (App Router) + React client components, TypeScript, the typed client in `src/lib/api.ts` talking through the `/api/cantila` proxy. No unit-test runner in this repo — verification is `node --experimental-strip-types` micro-tests for pure modules, plus `next build` and a dev smoke test.

**Out of scope (do NOT touch):** the hardcoded `accountId="acc_demo"` defaults in `src/lib/api.ts` and `MonitoringView`; the control-plane `acc_demo` seed/demo flows. These are noted follow-ups.

---

## File Structure

**Create:**
- `src/lib/constants.ts` — real reference config: `REGIONS`, `planTiers`.
- `src/lib/links.ts` — pure deep-link/slug helpers: `activityHref`, `mailboxSlug`, `numberSlug`.
- `src/components/ui/EmptyState.tsx` — shared empty-state panel.
- `src/components/ui/ErrorState.tsx` — shared "couldn't reach the control plane" panel.
- `scripts/test-links.mts` — micro-test for the relocated pure helpers.

**Modify (remove mock import; map `REGIONS`→constants, `activityHref`/slug→links; drop offline mock branch; add empty/error states):**
- `src/components/ActivityView.tsx` (reference task), `AutomationsView.tsx`, `BillingView.tsx`, `ConnectionsView.tsx`, `DatabasesView.tsx`, `DomainsView.tsx`, `MailView.tsx`, `MonitoringView.tsx`, `ProjectsView.tsx`, `SettingsView.tsx`, `SmsView.tsx`, `TeamView.tsx`, `TemplatesView.tsx`, `ProjectView.tsx`, `Sidebar.tsx`, `CommandPalette.tsx`, `NotificationsMenu.tsx`, `DeployList.tsx`, `ConversationsView.tsx`.
- Pages: `src/app/(console)/dashboard/page.tsx`, `src/app/(console)/mail/[box]/page.tsx`, `src/app/(console)/sms/[number]/page.tsx`.

**Delete (final task):** `src/lib/mock-data.ts`.

---

## Task 1: Relocate real constants to `src/lib/constants.ts`

**Files:**
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create the constants module**

```typescript
/* Real reference config (relocated out of mock-data.ts). These are NOT
   fabricated records — they are static platform constants the UI needs. */

import type { Region } from "@/lib/types";

/** Hetzner regions Cantila deploys to (city + region group label). */
export const REGIONS: Record<Region, { city: string; flag: string }> = {
  fsn1: { city: "Falkenstein, DE", flag: "EU" },
  hel1: { city: "Helsinki, FI", flag: "EU" },
  ash: { city: "Ashburn, US", flag: "US" },
};

/** Plan tiers for marketing/billing display. `current` is a display
   default; the BillingView marks the real current tier from the
   signed-in account's plan. */
export const planTiers = [
  { name: "Hobby", price: "$0", tagline: "Side projects", current: false },
  { name: "Starter", price: "$10", tagline: "Ship a real product", current: false },
  { name: "Pro", price: "$35", tagline: "Serious solo & small teams", current: true },
  { name: "Agency", price: "$99+", tagline: "Resellers & agencies", current: false },
] as const;
```

- [ ] **Step 2: Typecheck the module compiles**

Run: `npx tsc --noEmit src/lib/constants.ts 2>&1 | head` (expect no errors referencing constants.ts; pre-existing project-wide errors from isolated invocation are fine — the authoritative check is `next build` in Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "refactor: add src/lib/constants.ts (REGIONS, planTiers)"
```

---

## Task 2: Relocate pure helpers to `src/lib/links.ts`

**Files:**
- Create: `src/lib/links.ts`
- Create: `scripts/test-links.mts`

- [ ] **Step 1: Write the failing micro-test**

```typescript
// scripts/test-links.mts — run: node --experimental-strip-types scripts/test-links.mts
import assert from "node:assert/strict";
import { activityHref, mailboxSlug, numberSlug } from "../src/lib/links.ts";

assert.equal(mailboxSlug("Hello.World@cantila.app"), "hello-world-cantila-app");
assert.equal(numberSlug("+1 (555) 234-9900"), "1-555-234-9900");
assert.equal(activityHref({ kind: "deploy", project: "blog" } as any), "/projects/blog");
assert.equal(activityHref({ kind: "deploy" } as any), "/projects");
assert.equal(activityHref({ kind: "alert" } as any), "/monitoring");
assert.equal(activityHref({ kind: "billing" } as any), "/billing");
assert.equal(activityHref({ kind: "unknown" } as any), "/dashboard");
console.log("LINKS TEST PASSED");
```

- [ ] **Step 2: Run it to confirm it fails (module missing)**

Run: `node --experimental-strip-types scripts/test-links.mts`
Expected: FAIL — `Cannot find module '.../src/lib/links.ts'`.

- [ ] **Step 3: Create the links module**

```typescript
/* Pure deep-link + slug helpers (relocated out of mock-data.ts). No
   fabricated data — these map real records to Console URLs/slugs. */

import type { Activity } from "@/lib/types";

/** Deep-link an activity row to the surface it belongs to. */
export function activityHref(a: Activity): string {
  switch (a.kind) {
    case "deploy":
      return a.project ? `/projects/${a.project}` : "/projects";
    case "alert":
      return "/monitoring";
    case "database":
      return "/databases";
    case "domain":
      return "/domains";
    case "billing":
      return "/billing";
    case "member":
      return "/team";
    case "mail":
      return "/mail";
    case "sms":
      return "/sms";
    default:
      return "/dashboard";
  }
}

/** URL-safe slug for a mailbox address. */
export function mailboxSlug(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** URL-safe slug for an E.164 phone number. */
export function numberSlug(number: string): string {
  return number.replace(/[^0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
```

Note: the relocated `activityHref` drops the old `getProject(a.project)` existence check (that consulted the mock array). With real data we link to `/projects/${a.project}` whenever a project id is present.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node --experimental-strip-types scripts/test-links.mts`
Expected: PASS — prints `LINKS TEST PASSED`. (The `@/lib/types` import resolves only under the bundler; if the bare `node` run cannot resolve the `@/` alias, inline a local `type Activity = { kind: string; project?: string }` in the test and import the functions by copying is NOT allowed — instead run the test via `npx tsx scripts/test-links.mts` which honors tsconfig path aliases.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/links.ts scripts/test-links.mts
git commit -m "refactor: add src/lib/links.ts (activityHref, slug helpers) + test"
```

---

## Task 3: Shared `EmptyState` and `ErrorState` components

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/ErrorState.tsx`

- [ ] **Step 1: Create `EmptyState.tsx`**

```tsx
import type { ReactNode } from "react";

/** Standard empty-state panel — shown when a live list returns no rows.
   Matches the dot-grid panel idiom already used across the Console. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-2xs text-ink-faint">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `ErrorState.tsx`**

```tsx
/** Shown when a control-plane request throws (network/5xx). Replaces the
   old offline→mock fallback. */
export function ErrorState({
  title = "Couldn't reach the control plane",
  hint = "Retrying shortly. If this persists, check the control plane status.",
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-2xs text-ink-faint">{hint}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 text-2xs font-medium text-ember hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/EmptyState.tsx src/components/ui/ErrorState.tsx
git commit -m "feat: shared EmptyState/ErrorState components"
```

---

## Task 4: REFERENCE — remove mock fallback from `ActivityView` (the pattern)

This task shows the exact transform every API-backed view in Task 5 follows.

**Files:**
- Modify: `src/components/ActivityView.tsx`

- [ ] **Step 1: Replace the mock import with the relocated helper**

Delete:
```typescript
import { activity, activityHref } from "@/lib/mock-data";
```
Add:
```typescript
import { activityHref } from "@/lib/links";
import { ErrorState } from "@/components/ui/ErrorState";
```

- [ ] **Step 2: Remove the offline mock branch and track fetch errors**

In the mount effect, delete the offline fallback:
```typescript
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setEvents([...activity]);   // <-- DELETE these 3 lines
        return;
      }
```
Replace with: always proceed to load. Add an error flag:
```typescript
  const [loadError, setLoadError] = useState(false);
```
In `load()`, set `setLoadError(false)` on success and `setLoadError(true)` in the `catch` instead of swallowing.

- [ ] **Step 3: Remove the "control plane offline · mock feed" pill**

Delete the `liveMode === false ? (...offline·mock feed...) : null` branch in the `PageHeader` `actions` prop (keep the live "refreshing every 5s" pill).

- [ ] **Step 4: Render ErrorState on fetch failure**

Before the `filtered.length > 0` block, add:
```tsx
{loadError && events.length === 0 ? (
  <ErrorState onRetry={() => window.location.reload()} />
) : /* existing feed / empty-state ternary */ }
```
(The existing "No activity matches" block remains the empty state for an empty live feed.)

- [ ] **Step 5: Verify no mock references remain in the file**

Run: `grep -n "mock-data\|\\bactivity\\b\\s*\\]" src/components/ActivityView.tsx`
Expected: no `@/lib/mock-data` import; `activity` (the mock array) no longer referenced.

- [ ] **Step 6: Commit**

```bash
git add src/components/ActivityView.tsx
git commit -m "refactor(activity): drop offline mock fallback; error state on failure"
```

---

## Task 5: Apply the Task 4 pattern to the remaining API-backed views

For EACH file below, perform the same transform as Task 4:
1. Delete its `@/lib/mock-data` import line. If it imported `REGIONS`, add `import { REGIONS } from "@/lib/constants";`. If it imported `planTiers`, add `import { planTiers } from "@/lib/constants";`.
2. Delete the `if (!isControlPlaneLive()/!ok) { ...set mock state... }` branch so the real `api.*` path always runs.
3. Delete any "control plane offline · mock" pill/badge.
4. Add `const [loadError, setLoadError] = useState(false);`, set it in the fetch `catch`, and render `<ErrorState onRetry={() => window.location.reload()} />` (import from `@/components/ui/ErrorState`) when the relevant list is empty due to error. Keep/confirm the existing empty state for an empty-but-successful response; if a view lacks one, add `<EmptyState title="Nothing here yet" />` from `@/components/ui/EmptyState`.

Do them one file per commit, in this order:

- [ ] **Step 1: `ProjectsView.tsx`** — remove mock `projects`; `REGIONS`→constants. Empty: "No projects yet" with the existing "New project" action. Commit: `refactor(projects): drop mock fallback`.
- [ ] **Step 2: `DatabasesView.tsx`** — remove mock `databases`/`storageBuckets`; `REGIONS`→constants. Commit: `refactor(databases): drop mock fallback`.
- [ ] **Step 3: `MonitoringView.tsx`** — remove `mockUptimeMonitors`, `mockAlerts`, `mockIncidents`, `mockStatusComponents`; `REGIONS`→constants. (Leave the existing `api.getMonitoring("acc_demo", …)` call as-is — out of scope.) Commit: `refactor(monitoring): drop mock fallback`.
- [ ] **Step 4: `BillingView.tsx`** — remove `usage`, `invoices`, `dashboardStats`; `planTiers`→constants. Mark the current tier from the real account plan (from `api.getBillingSummary`/`getAccountMe`) by mapping its plan name onto `planTiers[].name`, overriding the static `current`. Commit: `refactor(billing): drop mock fallback; derive current tier`.
- [ ] **Step 5: `MailView.tsx`** — remove `mockMailDomains`, `mockMailboxes`, and any `mailAliases`/`mailEvents`/`mailVolume`/`mailStats`. Commit: `refactor(mail): drop mock fallback`.
- [ ] **Step 6: `SmsView.tsx`** — remove `mockPhoneNumbers` and any `smsMessages`/`verifications`/`smsVolume`/`smsStats`. Commit: `refactor(sms): drop mock fallback`.
- [ ] **Step 7: `DomainsView.tsx`** — remove `domains`/`registrarDomains`. Commit: `refactor(domains): drop mock fallback`.
- [ ] **Step 8: `TeamView.tsx`** — remove `team`. Commit: `refactor(team): drop mock fallback`.
- [ ] **Step 9: `ConnectionsView.tsx`** — remove `mockConnections`. Commit: `refactor(connections): drop mock fallback`.
- [ ] **Step 10: `AutomationsView.tsx`** — remove `mockAutomations`. Commit: `refactor(automations): drop mock fallback`.
- [ ] **Step 11: `TemplatesView.tsx`** — remove `templates`. If there is no templates endpoint, render `<EmptyState title="No templates available" />` (templates are a static catalog — if intended to stay, relocate the array to `src/lib/constants.ts` instead of deleting; decide by checking whether `api` exposes templates. Default: relocate to constants, since templates are real product config, not fabricated tenant data). Commit: `refactor(templates): move catalog to constants`.
- [ ] **Step 12: `SettingsView.tsx`** — remove `ACCOUNT`; use `api.getAccountMe()`/`whoami()` for org/handle/plan/email/initials. Commit: `refactor(settings): use real account, drop mock ACCOUNT`.
- [ ] **Step 13: `ProjectView.tsx`** — only imports `REGIONS`; swap to `@/lib/constants`. Commit: `refactor(project-detail): REGIONS from constants`.
- [ ] **Step 14: `Sidebar.tsx`** — replace whatever it reads from mock-data (likely `ACCOUNT` for the footer identity) with `api.getAccountMe()`/`whoami()`. Commit: `refactor(sidebar): real account identity`.

After each: `grep -n "mock-data" <file>` must return nothing.

---

## Task 6: Wire the dashboard page to real data

**Files:**
- Modify: `src/app/(console)/dashboard/page.tsx`

The page imports `projects, deployments, activity, fleet, dashboardStats, REGIONS, ACCOUNT` from mock-data and renders them directly (no API) — so it shows fabricated data in prod.

- [ ] **Step 1: Convert to a client component that fetches real data**

Add `"use client";` at the top. Remove the `@/lib/mock-data` import. Import `{ REGIONS } from "@/lib/constants"`, `{ api } from "@/lib/api"`, `{ EmptyState } from "@/components/ui/EmptyState"`, `{ ErrorState } from "@/components/ui/ErrorState"`, and `useEffect, useState`.

- [ ] **Step 2: Fetch the data the panels need**

In a mount effect, load in parallel and store in state:
```typescript
const [projects, setProjects] = useState<ApiProject[]>([]);
const [events, setEvents] = useState<ApiActivityEvent[]>([]);
const [capacity, setCapacity] = useState<ApiCapacityRollup | null>(null);
const [err, setErr] = useState(false);
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const [p, a, cap] = await Promise.all([
        api.listProjects(),
        api.listActivity(undefined, 8),
        api.getCapacity(),
      ]);
      if (cancelled) return;
      setProjects(p.projects);
      setEvents(a.events);
      setCapacity(cap);
    } catch {
      if (!cancelled) setErr(true);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

- [ ] **Step 3: Derive the stat cards from real data**

Replace `dashboardStats.*` usages: `liveProjects` = `projects.filter(p => p.status === "live").length`; `totalProjects` = `projects.length`. For request/uptime/spend cards, source from `capacity` and (optionally) `api.getBillingSummary()`; if a metric has no real source yet, omit that card rather than fabricate it.

- [ ] **Step 4: Replace the fleet panel**

Render fleet/region rollups from `capacity` (`getCapacity` / `getNodeFleetSummary`) keyed by `REGIONS`. If capacity is empty, show `<EmptyState title="No fleet data yet" />`.

- [ ] **Step 5: Replace projects + activity panels**

Render the real `projects` and `events` (map `events` to rows; deep-link via `activityHref` from `@/lib/links`). Empty → `<EmptyState .../>`. Top-level fetch error → `<ErrorState />`.

- [ ] **Step 6: Verify + commit**

Run: `grep -n "mock-data" "src/app/(console)/dashboard/page.tsx"` → nothing.
```bash
git add "src/app/(console)/dashboard/page.tsx"
git commit -m "feat(dashboard): render real projects/activity/capacity, drop mocks"
```

---

## Task 7: Wire the mail mailbox detail page

**Files:**
- Modify: `src/app/(console)/mail/[box]/page.tsx`
- Modify: `src/components/MailboxView.tsx` (props: accept the address/slug and fetch, or accept fetched data)

- [ ] **Step 1: Make the route dynamic + client-fetched**

Replace the static-params + mock-lookup page with a client component. Delete `generateStaticParams` and the `@/lib/mock-data` import. The page reads `params.box` and renders `<MailboxView slug={params.box} />`.

```tsx
import MailboxView from "@/components/MailboxView";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mailbox · Cantila Mail" };

export default function MailboxPage({ params }: { params: { box: string } }) {
  return <MailboxView slug={params.box} />;
}
```

- [ ] **Step 2: Make `MailboxView` fetch real data**

Change `MailboxView` to a `"use client"` component taking `{ slug }`. On mount, fetch `api.getMailFleet()` (find the mailbox whose `mailboxSlug(address) === slug`, importing `mailboxSlug` from `@/lib/links`) and `api.getMailInbox()` for its messages. Render `EmptyState` when the mailbox has no messages, `ErrorState` on failure, and call `notFound()`/render a not-found panel when no mailbox matches the slug.

- [ ] **Step 3: Verify + commit**

Run: `grep -rn "mock-data" "src/app/(console)/mail/[box]/page.tsx" src/components/MailboxView.tsx` → nothing.
```bash
git add "src/app/(console)/mail/[box]/page.tsx" src/components/MailboxView.tsx
git commit -m "feat(mail): live mailbox detail, drop mock lookup"
```

---

## Task 8: Wire the SMS number detail page

**Files:**
- Modify: `src/app/(console)/sms/[number]/page.tsx`
- Modify: `src/components/ConversationsView.tsx`

- [ ] **Step 1: Make the route dynamic + client-fetched**

Mirror Task 7: delete `generateStaticParams` + the mock import; render `<ConversationsView slug={params.number} />`.

```tsx
import ConversationsView from "@/components/ConversationsView";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Number · Cantila SMS" };

export default function NumberPage({ params }: { params: { number: string } }) {
  return <ConversationsView slug={params.number} />;
}
```

- [ ] **Step 2: Make `ConversationsView` fetch real data**

`"use client"`, prop `{ slug }`. Fetch `api.getSmsFleet()` (match `numberSlug(e164) === slug`, import `numberSlug` from `@/lib/links`) and `api.getSmsInbox()` for messages. `EmptyState` when no conversations, `ErrorState` on failure, not-found panel when no number matches. Remove the `getProject` mock import if present.

- [ ] **Step 3: Verify + commit**

Run: `grep -rn "mock-data" "src/app/(console)/sms/[number]/page.tsx" src/components/ConversationsView.tsx` → nothing.
```bash
git add "src/app/(console)/sms/[number]/page.tsx" src/components/ConversationsView.tsx
git commit -m "feat(sms): live number detail, drop mock lookup"
```

---

## Task 9: Wire CommandPalette to real projects

**Files:**
- Modify: `src/components/CommandPalette.tsx`

- [ ] **Step 1: Replace mock projects with a live fetch**

Remove `import { projects, deployments, getProject } from "@/lib/mock-data";`. On open (or mount), `const { projects } = await api.listProjects();` and build the project search entries from that. Drop `deployments`/`getProject` mock usage; if a command needs a project lookup, find it within the fetched `projects` array. If the fetch fails or is empty, the palette still shows its static navigation commands (no fabricated projects).

- [ ] **Step 2: Verify + commit**

Run: `grep -n "mock-data" src/components/CommandPalette.tsx` → nothing.
```bash
git add src/components/CommandPalette.tsx
git commit -m "feat(command-palette): search real projects, drop mocks"
```

---

## Task 10: Wire NotificationsMenu to real activity/alerts

**Files:**
- Modify: `src/components/NotificationsMenu.tsx`

- [ ] **Step 1: Replace mock feed**

Remove `import { activity, alerts, activityHref } from "@/lib/mock-data";`. Add `import { activityHref } from "@/lib/links";`. On mount/open, fetch `api.listActivity(undefined, 10)` for notifications; optionally `api.getMonitoring(...)` for active alerts. Empty → a small "You're all caught up" empty row. Fetch error → silently show the empty row (a dropdown shouldn't show a big error panel).

- [ ] **Step 2: Verify + commit**

Run: `grep -n "mock-data" src/components/NotificationsMenu.tsx` → nothing.
```bash
git add src/components/NotificationsMenu.tsx
git commit -m "feat(notifications): real activity feed, drop mocks"
```

---

## Task 11: Wire DeployList to a real project

**Files:**
- Modify: `src/components/DeployList.tsx`

- [ ] **Step 1: Remove the mock project lookup**

Remove `import { getProject } from "@/lib/mock-data";`. `DeployList` should receive its project/deployments via props from its parent (`ProjectView`, which already loads the real project via `api.getProject`) or fetch deployments via `api.getProject(id)` itself. Render `EmptyState` ("No deployments yet") when empty.

- [ ] **Step 2: Verify + commit**

Run: `grep -n "mock-data" src/components/DeployList.tsx` → nothing.
```bash
git add src/components/DeployList.tsx
git commit -m "feat(deploy-list): real deployments, drop mock lookup"
```

---

## Task 12: Delete mock-data.ts and verify the whole app

**Files:**
- Delete: `src/lib/mock-data.ts`

- [ ] **Step 1: Confirm zero remaining references**

Run: `grep -rn "mock-data\|mockData" src | grep -v node_modules`
Expected: NO output. If anything prints, fix that file using the relevant pattern (Task 5 recipe or a wiring task) before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/lib/mock-data.ts
```

- [ ] **Step 3: Build the whole app (typecheck + dangling-import catch)**

Run: `npm run build`
Expected: build succeeds. Any error like "Module not found: '@/lib/mock-data'" or a missing export means a reference was missed — fix and re-run until green.

- [ ] **Step 4: Dev smoke test against a live control plane**

Run the control plane (with the owner seed env) and `npm run dev`, then load: `/dashboard`, `/projects`, `/databases`, `/monitoring`, `/billing`, `/mail`, `/mail/<box>`, `/sms`, `/sms/<number>`, `/activity`. Confirm each shows real data or a proper empty/error state — and NO fabricated records (e.g., no "JJ Cantila / Pro" placeholder unless it is the real signed-in account, no fake projects/invoices/fleet nodes).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete mock-data.ts (console renders real data only)"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** constants relocation (Task 1), pure-helper relocation (Task 2), shared empty/error states (Task 3), API-backed fallback removal (Tasks 4–5), mock-only wiring — dashboard/mail/sms/command-palette/notifications/deploy-list (Tasks 6–11), delete + verify (Task 12). `acc_demo` scoping and control-plane seed remain explicitly out of scope per the spec.
- **Type consistency:** `activityHref`/`mailboxSlug`/`numberSlug` defined in Task 2 are imported from `@/lib/links` everywhere they are used (Tasks 4, 6, 7, 8, 10). `REGIONS`/`planTiers` defined in Task 1 are imported from `@/lib/constants` (Tasks 5, 6). `EmptyState`/`ErrorState` defined in Task 3 are imported from `@/components/ui/*` in all consuming tasks.
- **Empty-vs-wired:** every mock-only record view has a backing endpoint (`listProjects`, `listActivity`, `getCapacity`, `getMailFleet`+`getMailInbox`, `getSmsFleet`+`getSmsInbox`, `getMonitoring`, `getAccountMe`); only `TemplatesView` may lack one and is handled by relocating its catalog to constants (Task 5, Step 11).
