"use client";

/* ============================================================
   AssetGallery — every generated image / icon / animation / file
   the build agents produced, with inline previews. Reads
   GET /v1/projects/:id/assets and listens for asset_created
   events from the chat to keep itself fresh during a build.
   ============================================================ */

import { useEffect, useState } from "react";
import { Image as ImageIcon, Film, FileText, RefreshCw } from "lucide-react";
import { builderApi, type ApiProjectAsset } from "../lib/api";
import { AssetThumbnail } from "./ProjectChatMessages";

interface Props {
  projectId: string;
  /** Optionally seed with assets the chat has already received via SSE so
   *  the gallery is non-empty on first render. */
  initialAssets?: ApiProjectAsset[];
}

export default function ProjectAssetGallery({ projectId, initialAssets }: Props) {
  const [assets, setAssets] = useState<ApiProjectAsset[]>(initialAssets ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await builderApi.getProjectAssets(projectId);
      setAssets(res.assets);
    } finally {
      setLoading(false);
    }
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 px-4 py-6 text-center text-sm text-ink-dim">
        No assets yet. Ask the chat to generate a logo, hero image or animation
        and they&apos;ll land here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-dim">
          {assets.length} asset{assets.length === 1 ? "" : "s"} generated
        </div>
        <button
          onClick={refresh}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
          Refresh
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => (
          <AssetCard key={a.id} asset={a} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: ApiProjectAsset }) {
  const Icon = asset.mimeType.startsWith("image/")
    ? ImageIcon
    : asset.mimeType === "application/json"
      ? Film
      : FileText;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
      {asset.dataUrl ? (
        <AssetThumbnail dataUrl={asset.dataUrl} mimeType={asset.mimeType} />
      ) : (
        <div className="flex h-32 items-center justify-center bg-[#0a0b0d]">
          <Icon className="h-6 w-6 text-ink-faint" />
        </div>
      )}
      <div className="space-y-1 border-t border-border px-3 py-2.5">
        <div className="truncate font-mono text-2xs text-ink">{asset.path}</div>
        {asset.prompt && (
          <div className="line-clamp-2 text-2xs text-ink-faint">{asset.prompt}</div>
        )}
        <div className="flex items-center justify-between text-2xs text-ink-faint">
          <span className="rounded bg-bg px-1.5 py-0.5">{asset.kind}</span>
          <span>{asset.provider}</span>
        </div>
      </div>
    </div>
  );
}
