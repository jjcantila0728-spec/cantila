"use client";

import { Globe, FileCode, X } from "lucide-react";
import type { ApiProjectDetail } from "../../lib/api";
import { cx } from "../ui";
import BrowserPreview from "./BrowserPreview";
import OpsDrawer from "./OpsDrawer";
import CodeEditor from "./CodeEditor";

/* ============================================================
   PreviewColumn — the workspace's 4th column. A top tab bar
   switches between the live browser preview and any files the
   user opened from the file tree (each an editor tab sitting
   next to the Preview tab). The browser-style live preview is
   the hero, with operational surfaces in a slide-over OpsDrawer.
   ============================================================ */

const PREVIEW = "preview";

function leaf(path: string) {
  const p = path.split("/");
  return p[p.length - 1] || path;
}

export default function PreviewColumn({
  detail,
  liveUrl,
  onRefresh,
  openFiles,
  activeView,
  onSelectView,
  onCloseFile,
}: {
  detail: ApiProjectDetail;
  liveUrl: string | null;
  onRefresh: () => Promise<void>;
  openFiles: string[];
  activeView: string; // "preview" or a file path
  onSelectView: (view: string) => void;
  onCloseFile: (path: string) => void;
}) {
  const showPreview = activeView === PREVIEW;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-none border border-border bg-surface">
      {/* top tab bar: Preview + one tab per open file */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-1.5 pt-1.5">
        <button
          onClick={() => onSelectView(PREVIEW)}
          title="Live preview"
          className={cx(
            "flex h-7 shrink-0 items-center gap-1 rounded-none border-b-2 px-2.5 text-2xs",
            showPreview
              ? "border-ember bg-surface text-ink"
              : "border-transparent text-ink-dim hover:bg-surface-2",
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Preview</span>
        </button>
        {openFiles.map((path) => (
          <button
            key={path}
            onClick={() => onSelectView(path)}
            title={path}
            className={cx(
              "flex h-7 min-w-0 max-w-[180px] shrink-0 items-center gap-1 rounded-none border-b-2 px-2 text-2xs",
              activeView === path
                ? "border-ember bg-surface text-ink"
                : "border-transparent text-ink-dim hover:bg-surface-2",
            )}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{leaf(path)}</span>
            <span
              role="button"
              tabIndex={-1}
              aria-label="Close file"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(path);
              }}
              className="shrink-0 rounded p-0.5 text-ink-faint hover:bg-bg hover:text-ink"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>

      {/* body — preview hero (with ops drawer) or the active file editor.
          BrowserPreview stays mounted so its iframe/tab session survives
          while the user reads a file; only one surface is visible. */}
      <div className="relative min-h-0 flex-1">
        <div className={cx("absolute inset-0", showPreview ? "block" : "hidden")}>
          <BrowserPreview baseUrl={liveUrl} projectId={detail.project.id} />
          <OpsDrawer detail={detail} onRefresh={onRefresh} />
        </div>
        {!showPreview && (
          <div className="absolute inset-0">
            <CodeEditor key={activeView} projectId={detail.project.id} path={activeView} />
          </div>
        )}
      </div>
    </div>
  );
}
