"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, File as FileIcon, Loader2, FolderClosed } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { builderApi, type ApiFileNode, type ApiFileContent, ApiError } from "../../lib/api";
import { cx } from "../ui";

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

function langFor(path: string) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(path)) return [javascript({ jsx: true, typescript: true })];
  if (/\.html?$/.test(path)) return [html()];
  if (/\.css$/.test(path)) return [css()];
  if (/\.json$/.test(path)) return [json()];
  return [];
}

export default function ProjectFileTree({ projectId }: { projectId: string }) {
  const [flat, setFlat] = useState<ApiFileNode[] | null>(null);
  const [noRepo, setNoRepo] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<ApiFileContent | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

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

  const openFile = useCallback(
    async (path: string) => {
      setSelected(path);
      setLoadingFile(true);
      try {
        const c = await builderApi.getProjectFileContent(projectId, path);
        setFile(c);
        setDraft(c.content);
      } finally {
        setLoadingFile(false);
      }
    },
    [projectId],
  );

  const dirty = file !== null && draft !== file.content;

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
      <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        <TreeView
          nodes={tree}
          depth={0}
          open={open}
          selected={selected}
          onToggle={(p) =>
            setOpen((s) => {
              const n = new Set(s);
              if (n.has(p)) n.delete(p);
              else n.add(p);
              return n;
            })
          }
          onOpenFile={openFile}
        />
      </div>
      <div className="h-1 shrink-0 bg-border" />
      <div className="flex min-h-0 flex-[1.4] flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-2xs text-ink-dim">
          {selected ? (
            <>
              <FileIcon className="h-3.5 w-3.5" />
              <span className="truncate">{selected}</span>
              {dirty && <span className="h-1.5 w-1.5 rounded-full bg-ember" title="unsaved" />}
            </>
          ) : (
            <span>Select a file</span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loadingFile ? (
            <div className="flex items-center gap-2 p-3 text-sm text-ink-faint">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening…
            </div>
          ) : selected ? (
            <CodeMirror
              value={draft}
              extensions={langFor(selected)}
              onChange={setDraft}
              theme="dark"
              height="100%"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TreeView({
  nodes,
  depth,
  open,
  selected,
  onToggle,
  onOpenFile,
}: {
  nodes: TreeNode[];
  depth: number;
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
            style={{ paddingLeft: depth * 12 + 4 }}
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
            <TreeView
              nodes={n.children}
              depth={depth + 1}
              open={open}
              selected={selected}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
