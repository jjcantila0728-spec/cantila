# Remove frontend mock data (prod cleanup) — design

Date: 2026-05-29
Repo: cantila-console
Status: approved (design); pending implementation plan

## Goal

The Console must render only real control-plane data or proper empty/error
states — no fabricated records anywhere, including offline. Delete
`src/lib/mock-data.ts` entirely.

Today the views call the real API but fall back to `mock-data.ts` when
`isControlPlaneLive()` is false (offline/demo). A few views render mock
records with no API wiring at all (notably the dashboard and the mail/sms
detail pages), so they show fabricated data even in production. This change
removes the fallback and wires or empty-states those views.

## Scope

In scope: the frontend mock fallback only (Approach C — hybrid).

Out of scope (flagged, not in this change):
- Hardcoded `accountId="acc_demo"` defaults in `src/lib/api.ts` and
  `MonitoringView` (`api.getMonitoring("acc_demo")`). Mostly inert when a
  session is present (the control plane ignores the query param and scopes
  to the session account), but a real follow-up.
- The control-plane `acc_demo` "Demo Account" seed and demo-only flows.

## mock-data.ts: remove vs keep

Remove (fabricated records): `ACCOUNT, projects, getProject, deployments,
getDeployments, getEnvVars, getLogs, domains, getDomains, registrarDomains,
databases, getDatabase, team, activity, activityHref, usage, invoices,
dashboardStats, fleet, mailDomains, mailboxes, mailAliases, mailEvents,
mailVolume, mailStats, phoneNumbers, smsMessages, verifications, smsVolume,
smsStats, getEmails, mailboxSlug, getMailboxBySlug, getConversations,
numberSlug, getNumberBySlug, uptimeMonitors, alerts, incidents,
statusComponents, storageBuckets, automations, workflowsByAutomation,
connections, templates`.

Keep as real config, relocated out of mock-data:
- `REGIONS` → new `src/lib/constants.ts` (used by 6 files: dashboard,
  automations/new, DatabasesView, MonitoringView, ProjectsView, ProjectView).
- `planTiers` → consolidate onto the existing real source
  (`src/lib/billing-catalog-server.ts` / `api`), not a duplicate constant.

Once every import is migrated, delete `src/lib/mock-data.ts`.

## Core change: drop the offline mock fallback

`isControlPlaneLive()` gates ~25 files. The current shape is roughly:

```
if (await isControlPlaneLive()) { /* real api.* */ } else { /* mocks */ }
```

Replace with: always take the real API path. Then handle the two real
outcomes explicitly:
- control plane unreachable / request throws → an ErrorState
  ("Couldn't reach the control plane").
- reachable but no rows → the existing EmptyState.

Standardize on small shared `EmptyState` / `ErrorState` components, following
the idiom already present in `ActivityView` / `A2pView`. (If a single shared
component is cheap, extract one; otherwise match the local pattern per view.)

`isControlPlaneLive()` itself: keep the helper if still referenced for
non-mock reasons; otherwise remove dead uses. It must no longer select mock
data.

## Per-view handling (three buckets)

1. API-backed (remove the mock branch only): ActivityView, BillingView,
   ConnectionsView, DatabasesView, DomainsView, MailView, MonitoringView,
   ProjectsView, SettingsView, SmsView, TeamView, TemplatesView,
   AutomationsView.

2. Mock-only with a backing endpoint → wire it:
   - `app/(console)/dashboard/page.tsx` → `listProjects`, `listActivity`,
     `getCapacity` / `getNodeFleetSummary`, `getAccountMe` /
     `getBillingSummary` (derive the stat cards from real data).
   - `app/(console)/mail/[box]/page.tsx` → `getMailFleet` + `getMailInbox`.
   - `app/(console)/sms/[number]/page.tsx` → `getSmsFleet` + `getSmsInbox`.
   - `CommandPalette.tsx` → `listProjects`.
   - `NotificationsMenu.tsx` → `listActivity` + `getMonitoring` (alerts).
   - `DeployList.tsx`, `ConversationsView.tsx` → real `api.getProject`
     (passed from / fetched by the parent rather than the mock lookup).

3. Mock-only with no endpoint → EmptyState. Expected to be rare; the exact
   set is confirmed per-view during implementation. Any view whose real
   endpoint shape does not fit cleanly also degrades to an EmptyState rather
   than blocking the change.

## Data flow

Server components that currently import mock records (e.g. the dashboard,
the detail pages) either become client components that fetch via `api.*`
through the existing `/api/cantila` proxy, or fetch server-side through the
same proxy. Match whichever pattern the sibling API-backed views already use
(most are client components with `useEffect` + `api.*`).

## Testing / verification

- `next build` — typechecks the whole app and fails on any dangling
  `mock-data` import (the strongest automatic guard given there is no unit
  runner in the console).
- Grep guard: no remaining `@/lib/mock-data` imports; the file is deleted.
- Dev smoke against a live control plane: load dashboard, projects, mail,
  sms, monitoring, billing — confirm real data or empty/error states, and no
  fabricated records.

## Risk and rollback

~25-file surface plus deleting a 1023-line module. Executed on one focused
branch. Per-view degradation to EmptyState contains risk. Rollback is
`git revert` of the change (restores `mock-data.ts` and its imports).
