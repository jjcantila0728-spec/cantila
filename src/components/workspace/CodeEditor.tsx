"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { builderApi, type ApiFileContent, ApiError } from "../../lib/api";

/* ============================================================
   CodeEditor — opens a single project file as an editor surface.
   Lives inside PreviewColumn as a tab next to the live preview.
   Mount one per open file (key by path); it loads its own
   content, tracks the dirty draft, and saves (button or ⌘/Ctrl-S).
   ============================================================ */

function langFor(path: string) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(path)) return [javascript({ jsx: true, typescript: true })];
  if (/\.html?$/.test(path)) return [html()];
  if (/\.css$/.test(path)) return [css()];
  if (/\.json$/.test(path)) return [json()];
  return [];
}

export default function CodeEditor({ projectId, path }: { projectId: string; path: string }) {
  const [file, setFile] = useState<ApiFileContent | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setSaveErr(null);
    builderApi
      .getProjectFileContent(projectId, path)
      .then((c) => {
        if (!alive) return;
        setFile(c);
        setDraft(c.content);
      })
      .catch((e) => {
        if (!alive) return;
        setFile(null);
        setSaveErr(e instanceof Error ? `Couldn't open file: ${e.message}` : "Couldn't open file");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId, path]);

  const dirty = file !== null && draft !== file.content;

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
      const msg =
        e instanceof ApiError && e.status === 409
          ? "Can't save — file changed upstream or repo not writable. Reload the file."
          : e instanceof Error
            ? e.message
            : "save failed";
      setSaveErr(msg);
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

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-2xs text-ink-dim">
        <span className="truncate">{path}</span>
        {dirty && <span className="h-1.5 w-1.5 rounded-full bg-ember" title="unsaved" />}
        <button
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="ml-auto inline-flex h-6 items-center gap-1 rounded bg-ember px-2 text-2xs font-semibold text-[#1a0e08] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {saveErr && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-3 py-1 text-2xs text-red-300">
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
            extensions={langFor(path)}
            onChange={setDraft}
            theme="dark"
            height="100%"
          />
        ) : null}
      </div>
    </div>
  );
}
