"use client";

/* ============================================================
   ProjectWorkspace — the home of a single project under
   /@handle/<name>. A VS Code-style 4-column shell:
   - Far left: ProjectFileTree (the project's asset/file tree)
   - Center:   ProjectChat (the agent team)
   - Right:    PreviewColumn (live preview + ops tabs)
   Both side columns are independently resizable via Splitter,
   with widths persisted to localStorage. A slim toolbar sits
   on top; project settings open in a modal.

   The workspace also hosts the build-on-arrival flow: when the
   route is reached with `?build=1`, the prompt is read from
   sessionStorage (`cantila:build-prompt:<projectId>`) and the
   chat boots in build mode, streaming op cards as the agents
   work.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  builderApi,
  type ApiProjectDetail,
  type ApiProjectAsset,
} from "../lib/api";
import { cx, StatusBadge } from "./ui";
import ProjectChat from "./ProjectChat";
import Splitter from "./workspace/Splitter";
import ProjectFileTree from "./workspace/ProjectFileTree";
import PreviewColumn from "./workspace/PreviewColumn";
import { KeyboardShortcuts } from "./workspace/KeyboardShortcuts";
import { OPS_TABS, type OpsTab } from "./workspace/OpsDrawer";
import { useNavDrawer } from "./ConsoleShell";

const TREE_DEFAULT = 280, TREE_MIN = 200, TREE_MAX = 480, TREE_KEY = "cantila:workspace-tree-w";
const PREVIEW_DEFAULT = 760, PREVIEW_MIN = 360, PREVIEW_MAX = 1100, PREVIEW_KEY = "cantila:workspace-preview-w2";

interface Props {
  handle: string;
  projectName: string;
}

export default function ProjectWorkspace({ handle, projectName }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const isBuild = search.get("build") === "1";

  const [detail, setDetail] = useState<ApiProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { collapse } = useNavDrawer();
  useEffect(() => { collapse(); }, [collapse]);

  const [treeW, setTreeW] = useState(TREE_DEFAULT);
  const [previewW, setPreviewW] = useState(PREVIEW_DEFAULT);
  /* Operational surface shown in the preview's bottom sheet, driven by the
   * toolbar tabs. null = closed, so the preview/phone shows full height. */
  const [opsTab, setOpsTab] = useState<OpsTab | null>(null);

  /* Files opened from the tree become editor tabs in the preview column.
   * `activeView` is either "preview" or one of the open file paths. */
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<string>("preview");

  const openFile = useCallback((path: string) => {
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveView(path);
  }, []);

  const closeFile = useCallback((path: string) => {
    setOpenFiles((prev) => {
      const idx = prev.indexOf(path);
      const next = prev.filter((p) => p !== path);
      setActiveView((v) => {
        if (v !== path) return v;
        if (next.length === 0) return "preview";
        return next[Math.min(idx, next.length - 1)];
      });
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const t = Number(window.localStorage.getItem(TREE_KEY));
      if (!Number.isNaN(t) && t) setTreeW(Math.min(TREE_MAX, Math.max(TREE_MIN, t)));
      const p = Number(window.localStorage.getItem(PREVIEW_KEY));
      if (!Number.isNaN(p) && p) setPreviewW(Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, p)));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { window.localStorage.setItem(TREE_KEY, String(treeW)); } catch {} }, [treeW]);
  useEffect(() => { try { window.localStorage.setItem(PREVIEW_KEY, String(previewW)); } catch {} }, [previewW]);

  /* The build prompt is stashed in sessionStorage by /chat right before
   *  the redirect — we read it once and clear it so a refresh doesn't
   *  re-kick the build. */
  const initialBuildPrompt = useMemo(() => {
    if (!isBuild || typeof window === "undefined") return undefined;
    const key = `cantila:build-prompt:${handle}:${projectName}`;
    const value = window.sessionStorage.getItem(key);
    if (value) window.sessionStorage.removeItem(key);
    return value ?? undefined;
  }, [isBuild, handle, projectName]);

  /* Resolve the project from /@handle/<name>. Exposed as `refresh` so the
   *  operational tabs can re-pull project state after a mutation. */
  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const d = await builderApi.getProjectByHandle(handle, projectName);
        setDetail(d);
        setError(null);
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : "project not found");
        }
      }
    },
    [handle, projectName],
  );

  useEffect(() => {
    setError(null);
    setDetail(null);
    void load();
  }, [load]);

  const onAssetCreated = useCallback((_asset: ApiProjectAsset) => {
    /* assets surface inside PreviewColumn/file-tree now; no local buffer. */
  }, []);

  /* ---- dirty-path tracking (tab dots) ---- */
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
  const handleDirtyChange = useCallback((path: string, dirty: boolean) => {
    setDirtyPaths((prev) => {
      const next = new Set(prev);
      if (dirty) next.add(path); else next.delete(path);
      return next;
    });
  }, []);

  /* ---- deploy auto-refresh ---- */
  const [deployCount, setDeployCount] = useState(0);
  const handleDeployComplete = useCallback(() => {
    setDeployCount((n) => n + 1);
  }, []);

  /* ---- keyboard shortcuts overlay ---- */
  const [showShortcuts, setShowShortcuts] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <div className="font-display text-lg font-semibold text-ink">
          Couldn&apos;t open this project
        </div>
        <div className="max-w-md text-sm text-ink-dim">{error}</div>
        <button
          onClick={() => router.push("/projects")}
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 text-sm font-medium text-ink hover:border-ink-faint"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center gap-2 text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" />
        Resolving @{handle}/{projectName}…
      </div>
    );
  }

  const project = detail.project;
  const liveDomain = detail.domains.find((d) => d.primary) ?? detail.domains[0];
  const liveUrl = liveDomain ? `https://${liveDomain.hostname}` : null;

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[600px] flex-col">
      {/* slim toolbar — project title, status, and the operational tabs */}
      <div className="flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b border-border px-2">
        <span className={cx("h-2 w-2 shrink-0 rounded-full", project.status === "live" ? "bg-emerald-400" : "bg-ink-faint")} />
        <span className="shrink-0 font-display text-sm font-semibold text-ink">{project.name}</span>
        <StatusBadge status={project.status} />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {OPS_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setOpsTab((cur) => {
                  if (cur === key) return null;
                  setActiveView("preview");
                  return key;
                });
              }}
              title={label}
              className={cx(
                "inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-2xs font-medium",
                opsTab === key
                  ? "bg-bg text-ink shadow-sm"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noreferrer"
               className="ml-1 inline-flex h-7 items-center gap-1 rounded-lg bg-ember px-2.5 text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          )}
        </div>
      </div>

      {/* 4-column body (lg+) */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="min-h-0 shrink-0 overflow-hidden rounded-none border border-border bg-surface" style={{ width: treeW }}>
          <ProjectFileTree
            projectId={project.id}
            projectName={project.name}
            selectedPath={activeView === "preview" ? null : activeView}
            onOpenFile={openFile}
          />
        </div>
        <Splitter side="left" width={treeW} min={TREE_MIN} max={TREE_MAX} defaultWidth={TREE_DEFAULT} onChange={setTreeW} />

        <div className="flex min-h-0 flex-1 flex-col panel rounded-none overflow-hidden p-0">
          <ProjectChat projectId={project.id} projectName={project.name}
                       initialBuildPrompt={initialBuildPrompt} onAssetCreated={onAssetCreated}
                       onDeployComplete={handleDeployComplete} />
        </div>
        <Splitter side="right" width={previewW} min={PREVIEW_MIN} max={PREVIEW_MAX} defaultWidth={PREVIEW_DEFAULT} onChange={setPreviewW} />

        <div className="min-h-0 shrink-0" style={{ width: previewW }}>
          <PreviewColumn
            detail={detail}
            liveUrl={liveUrl}
            onRefresh={() => load({ silent: true })}
            openFiles={openFiles}
            activeView={activeView}
            onSelectView={setActiveView}
            onCloseFile={closeFile}
            opsTab={opsTab}
            onCloseOps={() => setOpsTab(null)}
            dirtyPaths={dirtyPaths}
            onDirtyChange={handleDirtyChange}
            deployCount={deployCount}
          />
        </div>
      </div>

      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}

      {/* mobile fallback — chat over preview, no file-tree */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:hidden">
        <div className="min-h-0 flex-1 panel rounded-none overflow-hidden p-0">
          <ProjectChat projectId={project.id} projectName={project.name}
                       initialBuildPrompt={initialBuildPrompt} onAssetCreated={onAssetCreated}
                       onDeployComplete={handleDeployComplete} />
        </div>
        <div className="min-h-0 flex-1">
          <PreviewColumn
            detail={detail}
            liveUrl={liveUrl}
            onRefresh={() => load({ silent: true })}
            openFiles={openFiles}
            activeView={activeView}
            onSelectView={setActiveView}
            onCloseFile={closeFile}
            opsTab={opsTab}
            onCloseOps={() => setOpsTab(null)}
            dirtyPaths={dirtyPaths}
            onDirtyChange={handleDirtyChange}
            deployCount={deployCount}
          />
        </div>
      </div>
    </div>
  );
}
