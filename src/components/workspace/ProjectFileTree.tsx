"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, File as FileIcon, Loader2, FolderClosed, Download } from "lucide-react";
import { strToU8, zipSync } from "fflate";
import { builderApi, type ApiFileNode, ApiError } from "../../lib/api";
import { cx } from "../ui";

/* ============================================================
   ProjectFileTree — the workspace's far-left column. Pure file
   tree: clicking a file lifts it to the parent (onOpenFile),
   which opens it as an editor tab in the preview column. The
   tree fills the whole column; nested levels are joined by
   vertical guide lines like a real file explorer.
   ============================================================ */

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

/** Fetch up to `limit` files at a time so a big repo doesn't open hundreds
 *  of requests at once. Returns a path→bytes map for fflate. */
async function fetchBlobs(
  projectId: string,
  blobs: string[],
  onProgress: (done: number) => void,
): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  let done = 0;
  const limit = 8;
  let cursor = 0;
  async function worker() {
    while (cursor < blobs.length) {
      const path = blobs[cursor++];
      try {
        const c = await builderApi.getProjectFileContent(projectId, path);
        out[path] = strToU8(c.content);
      } catch {
        /* skip unreadable/binary files rather than failing the whole archive */
      }
      onProgress(++done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, blobs.length) }, worker));
  return out;
}

export default function ProjectFileTree({
  projectId,
  projectName,
  selectedPath,
  onOpenFile,
}: {
  projectId: string;
  projectName: string;
  selectedPath: string | null;
  onOpenFile: (path: string) => void;
}) {
  const [flat, setFlat] = useState<ApiFileNode[] | null>(null);
  const [noRepo, setNoRepo] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipMsg, setZipMsg] = useState<string | null>(null);

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

  const downloadZip = useCallback(async () => {
    if (!flat || zipping) return;
    const blobs = flat.filter((n) => n.type === "blob").map((n) => n.path);
    if (blobs.length === 0) {
      setZipMsg("No files to download");
      return;
    }
    setZipping(true);
    setZipMsg(`Packing 0/${blobs.length}…`);
    try {
      const files = await fetchBlobs(projectId, blobs, (done) =>
        setZipMsg(`Packing ${done}/${blobs.length}…`),
      );
      const zipped = zipSync(files, { level: 6 });
      const safeName = (projectName || "project").replace(/[^a-z0-9._-]+/gi, "-");
      // copy into a fresh ArrayBuffer-backed view so Blob is happy across TS lib targets
      const blob = new Blob([zipped.slice()], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setZipMsg(null);
    } catch (e) {
      setZipMsg(e instanceof Error ? `Download failed: ${e.message}` : "Download failed");
    } finally {
      setZipping(false);
    }
  }, [flat, zipping, projectId, projectName]);

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
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">Files</span>
        <button
          onClick={() => void downloadZip()}
          disabled={zipping}
          title="Download project as .zip"
          className="ml-auto inline-flex h-6 items-center gap-1 rounded border border-border px-2 text-2xs text-ink-dim hover:border-ink-faint hover:text-ink disabled:opacity-50"
        >
          {zipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {zipping ? "Packing…" : ".zip"}
        </button>
      </div>
      {zipMsg && (
        <div className="shrink-0 border-b border-border px-2 py-1 text-2xs text-ink-faint">{zipMsg}</div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        <TreeView
          nodes={tree}
          open={open}
          selected={selectedPath}
          onToggle={(p) =>
            setOpen((s) => {
              const n = new Set(s);
              if (n.has(p)) n.delete(p);
              else n.add(p);
              return n;
            })
          }
          onOpenFile={onOpenFile}
        />
      </div>
    </div>
  );
}

function TreeView({
  nodes,
  open,
  selected,
  onToggle,
  onOpenFile,
}: {
  nodes: TreeNode[];
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
            /* indent guide: a vertical line joins this folder's children */
            <div className="ml-[11px] border-l border-border/70 pl-1.5">
              <TreeView
                nodes={n.children}
                open={open}
                selected={selected}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
