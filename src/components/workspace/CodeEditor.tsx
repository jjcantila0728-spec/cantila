"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { search, searchKeymap } from "@codemirror/search";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { keymap, lineNumbers } from "@codemirror/view";
import { builderApi, type ApiFileContent, ApiError } from "../../lib/api";

/* ============================================================
   CodeEditor — opens a single project file as an editor surface.
   Lives inside PreviewColumn as a tab next to the live preview.
   Mount one per open file (key by path); it loads its own
   content, tracks the dirty draft, and saves (button or ⌘/Ctrl-S).

   Reports dirty state up via onDirtyChange so the tab bar can
   show an unsaved-changes dot.
   ============================================================ */

function langFor(path: string) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(path)) return [javascript({ jsx: true, typescript: true })];
  if (/\.html?$/.test(path)) return [html()];
  if (/\.css$/.test(path)) return [css()];
  if (/\.json$/.test(path)) return [json()];
  if (/\.mdx?$/.test(path)) return [markdown()];
  if (/\.py$/.test(path)) return [python()];
  if (/\.ya?ml$/.test(path)) return [yaml()];
  return [];
}

export default function CodeEditor({
  projectId,
  path,
  onDirtyChange,
}: {
  projectId: string;
  path: string;
  /** Called whenever this file's dirty state changes — lets the parent
   *  show a dot on the tab. Also called with false when the component
   *  unmounts (tab closed). */
  onDirtyChange?: (path: string, dirty: boolean) => void;
}) {
  const [file, setFile] = useState<ApiFileContent | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const onDirtyRef = useRef(onDirtyChange);
  onDirtyRef.current = onDirtyChange;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setSaveErr(null);
    setFile(null);
    builderApi
      .getProjectFileContent(projectId, path)
      .then((c) => {
        if (!alive) return;
        setFile(c);
        setDraft(c.content);
      })
      .catch((e) => {
        if (!alive) return;
        setSaveErr(e instanceof Error ? `Couldn't open: ${e.message}` : "Couldn't open file");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId, path]);

  const dirty = file !== null && draft !== file.content;

  // Propagate dirty state up so the tab bar can show an indicator.
  useEffect(() => {
    onDirtyRef.current?.(path, dirty);
  }, [path, dirty]);

  // When the editor is unmounted (tab closed), clear the dirty flag.
  useEffect(() => {
    return () => {
      onDirtyRef.current?.(path, false);
    };
  }, [path]);

  const save = useCallback(async () => {
    if (!file || !dirty) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await builderApi.putProjectFile(projectId, {
        path,
        content: draft,
        sha: file.sha,
      });
      setFile({ content: draft, sha: res.sha, encoding: "utf-8" });
    } catch (e) {
      setSaveErr(
        e instanceof ApiError && e.status === 409
          ? "Can't save — file changed upstream. Reload."
          : e instanceof Error
            ? e.message
            : "save failed",
      );
    } finally {
      setSaving(false);
    }
  }, [file, dirty, draft, projectId, path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const extensions = [
    ...langFor(path),
    lineNumbers(),
    search({ top: true }),
    keymap.of(searchKeymap),
    autocompletion(),
    closeBrackets(),
  ];

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5 text-2xs text-ink-dim">
        <span className="min-w-0 flex-1 truncate">{path}</span>
        {dirty && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" title="unsaved changes" />
        )}
        <span className="shrink-0 font-mono text-[0.6rem] text-ink-faint">⌘F search · ⌘S save</span>
        <button
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="shrink-0 inline-flex h-6 items-center gap-1 rounded bg-ember px-2 text-2xs font-semibold text-[#1a0e08] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {saveErr && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-3 py-1 text-2xs text-red-300">
          {saveErr}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-ink-faint">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening…
          </div>
        ) : file ? (
          <CodeMirror
            value={draft}
            extensions={extensions}
            onChange={setDraft}
            theme="dark"
            style={{ height: "100%", fontSize: "13px" }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-red-400">
            {saveErr ?? "Couldn't load file"}
          </div>
        )}
      </div>
    </div>
  );
}
