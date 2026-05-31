"use client";

/* ============================================================
   Chat message model + mapper (+ shared AssetThumbnail).

   The rich rendering now lives in `src/components/chat/*`
   (ChatMessage / OpCard / FleetStrip, orchestrated by
   ProjectChat). This module keeps the durable bits that other
   modules import:

   - the `ChatMsg` / `ChatOp` message types,
   - `projectMessagesToChat` — maps the persisted API rows into
     `ChatMsg[]` (rolling op_card rows up per opKey),
   - `AssetThumbnail` — the inline asset preview (also used by
     ProjectAssetGallery).
   ============================================================ */

import { Film, FileText } from "lucide-react";

export type OpStatus = "running" | "done" | "failed";
export type OpKey = string;

export interface ChatOp {
  key: OpKey;
  title: string;
  detail?: string;
  status: OpStatus;
  agent?: string;
  log?: string[];
  /** When the op produced an asset (image/lottie/css), the renderer can
   *  inline a preview so the user sees the result without leaving chat. */
  asset?: {
    path: string;
    mimeType: string;
    dataUrl?: string;
    provider?: string;
  };
}

export type ChatMsg =
  | { id: string; kind: "user"; text: string; files?: string[]; createdAt?: string }
  | { id: string; kind: "agent"; text: string; agent?: string; createdAt?: string }
  | { id: string; kind: "op"; op: ChatOp; createdAt?: string }
  | { id: string; kind: "result"; name: string; url: string; stack: string; createdAt?: string };

/** Render an inline preview for an asset by mime type — SVG / PNG / JPG
 *  show as <img>; Lottie JSON shows as a code preview (rendering Lottie
 *  inline would pull in another dep); CSS shows as a code block. */
export function AssetThumbnail({
  dataUrl,
  mimeType,
}: {
  dataUrl: string;
  mimeType: string;
}) {
  if (mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dataUrl}
        alt="generated asset"
        className="block h-32 w-auto max-w-[18rem] object-contain bg-[#0a0b0d]"
      />
    );
  }
  if (mimeType === "application/json") {
    // Lottie JSON — show the first line so it's recognisable.
    return (
      <div className="flex h-32 w-72 items-center gap-2 bg-[#0a0b0d] px-3 font-mono text-2xs text-ink-faint">
        <Film className="h-4 w-4 text-ember" />
        Lottie animation
      </div>
    );
  }
  if (mimeType === "text/css") {
    return (
      <div className="flex h-32 w-72 items-center gap-2 bg-[#0a0b0d] px-3 font-mono text-2xs text-ink-faint">
        <FileText className="h-4 w-4 text-ember" />
        CSS keyframe animation
      </div>
    );
  }
  return (
    <div className="flex h-32 w-72 items-center gap-2 bg-[#0a0b0d] px-3 font-mono text-2xs text-ink-faint">
      <FileText className="h-4 w-4 text-ember" />
      {mimeType}
    </div>
  );
}

/** Build a ChatMsg list from an ApiProjectMessage list — preserves the
 *  order and rolls op_card rows up into a single op message per opKey
 *  (running → done/failed). */
export function projectMessagesToChat(rows: {
  id: string;
  role: string;
  agent?: string;
  kind: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}[]): ChatMsg[] {
  const out: ChatMsg[] = [];
  const opIndex = new Map<string, number>();

  for (const m of rows) {
    if (m.role === "user" && m.kind === "message") {
      out.push({ id: m.id, kind: "user", text: m.content, createdAt: m.createdAt });
      continue;
    }
    if (m.kind === "message" || m.kind === "result" || m.kind === "asset") {
      if (m.kind === "result" && m.metadata) {
        const meta = m.metadata as Record<string, unknown>;
        out.push({
          id: m.id,
          kind: "result",
          name: String(meta.name ?? "project"),
          url: String(meta.url ?? ""),
          stack: String(meta.stack ?? ""),
          createdAt: m.createdAt,
        });
        continue;
      }
      if (m.kind === "asset" && m.metadata) {
        const meta = m.metadata as Record<string, unknown>;
        const opKey = String(meta.opKey ?? `asset:${m.id}`);
        out.push({
          id: m.id,
          kind: "op",
          createdAt: m.createdAt,
          op: {
            key: opKey,
            title: m.content,
            agent: m.agent,
            status: meta.status === "failed" ? "failed" : meta.status === "done" ? "done" : "running",
            detail: typeof meta.detail === "string" ? meta.detail : undefined,
            asset: {
              path: String(meta.path ?? ""),
              mimeType: typeof meta.mimeType === "string" ? meta.mimeType : "image/svg+xml",
              dataUrl: typeof meta.dataUrl === "string" ? meta.dataUrl : undefined,
              provider: typeof meta.provider === "string" ? meta.provider : undefined,
            },
          },
        });
        continue;
      }
      out.push({ id: m.id, kind: "agent", text: m.content, agent: m.agent, createdAt: m.createdAt });
      continue;
    }
    if (m.kind === "op_card") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const opKey = String(meta.opKey ?? m.id);
      const next: ChatOp = {
        key: opKey,
        title: m.content,
        agent: m.agent,
        status: meta.status === "failed" ? "failed" : meta.status === "done" ? "done" : "running",
        detail: typeof meta.detail === "string" ? meta.detail : undefined,
      };
      const existing = opIndex.get(opKey);
      if (existing !== undefined) {
        out[existing] = { id: m.id, kind: "op", op: next, createdAt: m.createdAt };
      } else {
        opIndex.set(opKey, out.length);
        out.push({ id: m.id, kind: "op", op: next, createdAt: m.createdAt });
      }
    }
  }
  return out;
}
