/* ============================================================
   Live automation instances.

   These are the production n8n + OpenClaw workspaces that the
   Cantila platform runs out of the box. They are surfaced in the
   Console (AutomationsView) and resolvable by AutomationWorkspace
   even when the control plane has no automations registered, so
   the platform always exposes the live workspaces — embedded via
   the workspace iframe, with "Open in new tab" to the native URL.

   The ids are stable so deep links (/automations/<id>) keep working.
   ============================================================ */

import type { ApiAutomation } from "@/lib/api";

export const LIVE_AUTOMATIONS: ApiAutomation[] = [
  {
    id: "auto_live_n8n",
    kind: "n8n",
    name: "n8n",
    slug: "n8n",
    status: "live",
    region: "fsn1",
    alwaysOn: true,
    createdAt: "2026-06-14T00:00:00.000Z",
    adminUrl: "https://n8n.cantila.app",
    workspaceUrl: "https://n8n.cantila.app",
  },
  {
    id: "auto_live_openclaw",
    kind: "openclaw",
    name: "OpenClaw",
    slug: "openclaw",
    status: "live",
    region: "fsn1",
    alwaysOn: true,
    createdAt: "2026-06-14T00:00:00.000Z",
    adminUrl: "https://openclaw.cantila.app",
    workspaceUrl: "https://openclaw.cantila.app",
  },
];

/** Look up a live instance by its stable automation id. */
export function getLiveAutomation(id: string): ApiAutomation | undefined {
  return LIVE_AUTOMATIONS.find((a) => a.id === id);
}

/** The live instances for one kind (or all when kind is omitted). */
export function liveAutomationsForKind(
  kind?: ApiAutomation["kind"],
): ApiAutomation[] {
  return kind ? LIVE_AUTOMATIONS.filter((a) => a.kind === kind) : LIVE_AUTOMATIONS;
}
