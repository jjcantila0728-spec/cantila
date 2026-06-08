"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Loader2,
  FolderClosed,
  Download,
  FilePlus,
  Trash2,
  Search,
  X,
  Check,
} from "lucide-react";
import { builderApi, type ApiFileNode, ApiError } from "../../lib/api";
import { cx } from "../ui";

interface TreeNode {
  name: string;
  path: string;
  type: "blob" | "tree";
  sha: string;
  children: TreeNode[];
}
function buildTree(flat: ApiFileNode[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "tree", sha: "", children: [] };
  const dirs = new Map<string, TreeNode>([["", root]]);
  for (const node of [...flat].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = node.path.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parent = dirs.get(parentPath) ?? root;
    const tn: TreeNode = { name, path: node.path, type: node.type, sha: node.sha ?? "", children: [] };
    parent.children.push(tn);
    if (node.type === "tree") dirs.set(node.path, tn);
  }
  return root.children;
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

  /* Search */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  /* New-file inline input */
  const [newFilePath, setNewFilePath] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  /* Delete confirm */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    setFlat(null);
    let alive = true;
    builderApi
      .getProjectFiles(projectId)
      .then((r) => alive && setFlat(r.files))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 409) setNoRepo(true);
        setFlat([]);
      });
    return () => { alive = false; };
  }, [projectId]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  const shaByPath = useMemo(() => {
    const m = new Map<string, string>();
    if (flat) flat.forEach((f) => m.set(f.path, f.sha ?? ""));
    return m;
  }, [flat]);

  const tree = useMemo(() => (flat ? buildTree(flat) : []), [flat]);

  /* Filtered flat list for search results */
  const filteredBlobs = useMemo(() => {
    if (!flat || !searchQ.trim()) return null;
    const q = searchQ.toLowerCase();
    return flat.filter((f) => f.type === "blob" && f.path.toLowerCase().includes(q));
  }, [flat, searchQ]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((v) => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 50);
      return !v;
    });
    setSearchQ("");
  }, []);

  const startNewFile = useCallback(() => {
    setShowNewInput(true);
    setNewFilePath("");
    setCreateErr(null);
    setTimeout(() => newInputRef.current?.focus(), 50);
  }, []);

  const commitNewFile = useCallback(async () => {
    const p = newFilePath.trim();
    if (!p) { setShowNewInput(false); return; }
    setCreating(true);
    setCreateErr(null);
    try {
      await builderApi.putProjectFile(projectId, { path: p, content: "" });
      setShowNewInput(false);
      reload();
      onOpenFile(p);
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : "create failed");
    } finally {
      setCreating(false);
    }
  }, [newFilePath, projectId, reload, onOpenFile]);

  const confirmDelete = useCallback(async (path: string) => {
    const sha = shaByPath.get(path) ?? "";
    setDeleting(true);
    try {
      await builderApi.deleteProjectFile(projectId, path, sha);
      setPendingDelete(null);
      reload();
    } catch (e) {
      console.error("delete failed", e);
    } finally {
      setDeleting(false);
    }
  }, [shaByPath, projectId, reload]);

  const downloadZip = useCallback(async () => {
    if (zipping) return;
    setZipping(true);
    setZipMsg("Preparing archive…");
    try {
      const res = await fetch(builderApi.projectArchiveHref(projectId), {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error === "no-repo") msg = "No repo connected yet";
          else if (j?.error) msg = j.error;
        } catch { /* non-JSON */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const safeName = (projectName || "project").replace(/[^a-z0-9._-]+/gi, "-");
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
      setZipMsg(e instanceof Error ? e.message : "Download failed");
    } finally {
      setZipping(false);
    }
  }, [zipping, projectId, projectName]);

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
      {/* header toolbar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">Files</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={toggleSearch}
            title="Search files"
            className={cx(
              "rounded p-1 text-ink-dim hover:bg-surface-2 hover:text-ink",
              searchOpen && "bg-surface-2 text-ink",
            )}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={startNewFile}
            title="New file"
            className="rounded p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => void downloadZip()}
            disabled={zipping}
            title="Download .zip"
            className="rounded p-1 text-ink-dim hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {zipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* search input */}
      {searchOpen && (
        <div className="shrink-0 border-b border-border px-2 py-1.5">
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface px-2">
            <Search className="h-3 w-3 shrink-0 text-ink-faint" />
            <input
              ref={searchRef}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Filter files…"
              className="h-6 flex-1 bg-transparent text-2xs text-ink outline-none placeholder:text-ink-faint"
            />
            {searchQ && (
              <button onClick={() => setSearchQ("")} className="shrink-0 text-ink-faint hover:text-ink">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* new-file inline input */}
      {showNewInput && (
        <div className="shrink-0 border-b border-border px-2 py-1.5">
          <div className="flex items-center gap-1">
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
            <input
              ref={newInputRef}
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitNewFile();
                if (e.key === "Escape") setShowNewInput(false);
              }}
              placeholder="path/to/file.ts"
              className="h-6 min-w-0 flex-1 rounded border border-ember bg-surface px-1.5 text-2xs text-ink outline-none"
            />
            <button
              onClick={() => void commitNewFile()}
              disabled={creating}
              className="shrink-0 rounded p-0.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setShowNewInput(false)} className="shrink-0 rounded p-0.5 text-ink-faint hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {createErr && <div className="mt-0.5 text-2xs text-red-400">{createErr}</div>}
        </div>
      )}

      {zipMsg && (
        <div className="shrink-0 border-b border-border px-2 py-1 text-2xs text-ink-faint">{zipMsg}</div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        {filteredBlobs ? (
          /* flat search results */
          filteredBlobs.length === 0 ? (
            <div className="px-2 py-1 text-2xs text-ink-faint">No matches</div>
          ) : (
            <ul>
              {filteredBlobs.map((f) => (
                <li key={f.path} className="group flex items-center">
                  <button
                    onClick={() => onOpenFile(f.path)}
                    title={f.path}
                    className={cx(
                      "flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-surface-2",
                      selectedPath === f.path && "bg-surface-2 text-ink",
                    )}
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    <span className="truncate text-2xs">{f.path}</span>
                  </button>
                  <DeleteButton
                    path={f.path}
                    pending={pendingDelete}
                    deleting={deleting}
                    onAsk={() => setPendingDelete(f.path)}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={() => void confirmDelete(f.path)}
                  />
                </li>
              ))}
            </ul>
          )
        ) : (
          <TreeView
            nodes={tree}
            open={open}
            selected={selectedPath}
            pendingDelete={pendingDelete}
            deleting={deleting}
            onToggle={(p) =>
              setOpen((s) => {
                const n = new Set(s);
                if (n.has(p)) n.delete(p);
                else n.add(p);
                return n;
              })
            }
            onOpenFile={onOpenFile}
            onAskDelete={(p) => setPendingDelete(p)}
            onCancelDelete={() => setPendingDelete(null)}
            onConfirmDelete={(p) => void confirmDelete(p)}
          />
        )}
      </div>
    </div>
  );
}

function DeleteButton({
  path,
  pending,
  deleting,
  onAsk,
  onCancel,
  onConfirm,
}: {
  path: string;
  pending: string | null;
  deleting: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (pending === path) {
    return (
      <span className="ml-1 flex shrink-0 items-center gap-0.5">
        <button
          onClick={onConfirm}
          disabled={deleting}
          title="Confirm delete"
          className="rounded p-0.5 text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button onClick={onCancel} title="Cancel" className="rounded p-0.5 text-ink-faint hover:text-ink">
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onAsk(); }}
      title="Delete file"
      className="ml-1 hidden shrink-0 rounded p-0.5 text-ink-faint hover:text-red-400 group-hover:block"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

function TreeView({
  nodes,
  open,
  selected,
  pendingDelete,
  deleting,
  onToggle,
  onOpenFile,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  nodes: TreeNode[];
  open: Set<string>;
  selected: string | null;
  pendingDelete: string | null;
  deleting: boolean;
  onToggle: (p: string) => void;
  onOpenFile: (p: string) => void;
  onAskDelete: (p: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (p: string) => void;
}) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path} className="group">
          <div className="flex items-center">
            <button
              onClick={() => (n.type === "tree" ? onToggle(n.path) : onOpenFile(n.path))}
              className={cx(
                "flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-surface-2",
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
            {n.type === "blob" && (
              <DeleteButton
                path={n.path}
                pending={pendingDelete}
                deleting={deleting}
                onAsk={() => onAskDelete(n.path)}
                onCancel={onCancelDelete}
                onConfirm={() => onConfirmDelete(n.path)}
              />
            )}
          </div>
          {n.type === "tree" && open.has(n.path) && (
            <div className="ml-[11px] border-l border-border/70 pl-1.5">
              <TreeView
                nodes={n.children}
                open={open}
                selected={selected}
                pendingDelete={pendingDelete}
                deleting={deleting}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
                onAskDelete={onAskDelete}
                onCancelDelete={onCancelDelete}
                onConfirmDelete={onConfirmDelete}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
