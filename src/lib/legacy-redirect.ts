/* ============================================================
   Legacy URL resolver — `prj_*` id → `/@handle/<name>`.

   Used client-side by the legacy /projects/[id],
   /projects/live/[id], /automations/[id] redirect pages.
   ============================================================ */

import { api } from "./api";

/** Best-effort lookup. On any failure (project gone, auth missing,
 *  network) we fall back to `/projects`, which is always safe. */
export async function resolveLegacyProjectUrl(projectId: string): Promise<string> {
  try {
    const [detail, account] = await Promise.all([
      api.getProject(projectId),
      api.getAccountMe().catch(() => null),
    ]);
    const handle = account?.handle ?? "me";
    return `/@${handle}/${encodeURIComponent(detail.project.name)}`;
  } catch {
    return "/projects";
  }
}
