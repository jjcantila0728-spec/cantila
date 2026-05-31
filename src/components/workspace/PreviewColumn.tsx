"use client";

import type { ApiProjectDetail } from "../../lib/api";
import BrowserPreview from "./BrowserPreview";
import OpsDrawer from "./OpsDrawer";

/* ============================================================
   PreviewColumn — the workspace's 4th column. A browser-style
   live preview fills the column (the hero), with the operational
   surfaces in a slide-over OpsDrawer overlaying the bottom.
   ============================================================ */
export default function PreviewColumn({
  detail,
  liveUrl,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  liveUrl: string | null;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-border bg-surface">
      <BrowserPreview baseUrl={liveUrl} projectId={detail.project.id} />
      <OpsDrawer detail={detail} onRefresh={onRefresh} />
    </div>
  );
}
