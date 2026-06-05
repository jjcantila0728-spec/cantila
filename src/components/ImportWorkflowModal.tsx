"use client";

/* ============================================================
   ImportWorkflowModal — bring an already-built n8n workflow in.

   Paste the JSON or upload the `.json` file you get from n8n's
   *Download* / *Copy to clipboard*. We parse it client-side to show
   a preview (name + node count) and catch malformed JSON before any
   request, then POST to the import route, which converts it to the
   canonical graph and creates a fresh workflow.
   ============================================================ */

import { useMemo, useRef, useState } from "react";
import { X, Upload, Loader2, AlertCircle, FileJson, Check } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  automationId: string;
  onClose: () => void;
  onImported: (workflowId: string) => void;
}

interface Preview {
  workflow: Record<string, unknown>;
  name: string;
  nodeCount: number;
}

/** Parse + validate pasted text into a preview, or an error string. */
function previewFrom(text: string): { preview?: Preview; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: "That isn't valid JSON. Paste the workflow export exactly as n8n gives it." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Expected a workflow object — got something else." };
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.nodes)) {
    return { error: "This doesn't look like an n8n workflow — no `nodes` array found." };
  }
  return {
    preview: {
      workflow: obj,
      name: typeof obj.name === "string" && obj.name ? obj.name : "Imported workflow",
      nodeCount: obj.nodes.length,
    },
  };
}

export default function ImportWorkflowModal({
  automationId,
  onClose,
  onImported,
}: Props) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { preview, error: parseError } = useMemo(() => previewFrom(text), [text]);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  async function submit() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const { workflow } = await api.importWorkflow(automationId, {
        workflow: preview.workflow,
        name: name.trim() || undefined,
      });
      onImported(workflow.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "import failed");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-2xl space-y-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">
              Import an existing workflow
            </h2>
            <p className="mt-0.5 text-2xs text-ink-faint">
              Paste the JSON from n8n&apos;s <em>Download</em> or{" "}
              <em>Copy to clipboard</em>, or upload the <code>.json</code> file.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ember/40 hover:text-ember"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload .json
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <span className="text-2xs text-ink-faint">or paste below</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{ "name": "My workflow", "nodes": [ … ], "connections": { … } }'
          rows={8}
          className="block w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-2xs text-ink outline-none transition-colors focus:border-ember focus:ring-1 focus:ring-ember/30"
          autoFocus
        />

        {/* live preview / parse feedback */}
        {parseError && (
          <div className="flex items-center gap-2 text-2xs font-medium text-down">
            <AlertCircle className="h-3.5 w-3.5" />
            {parseError}
          </div>
        )}
        {preview && (
          <div className="panel flex items-center gap-3 border-live/30 bg-live/5 px-4 py-3">
            <FileJson className="h-4 w-4 text-live" />
            <div className="min-w-0 flex-1 text-2xs">
              <div className="flex items-center gap-1.5 font-medium text-ink">
                <Check className="h-3 w-3 text-live" />
                Looks good
              </div>
              <div className="mt-0.5 truncate text-ink-dim">
                <span className="font-semibold">{preview.name}</span> ·{" "}
                {preview.nodeCount} node{preview.nodeCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        )}

        {/* optional name override */}
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Name (optional — overrides the imported name)
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={preview?.name ?? "Imported workflow"}
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ember focus:ring-1 focus:ring-ember/30"
          />
        </label>

        {error && (
          <div className="flex items-center gap-2 text-2xs font-medium text-down">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-ink-dim hover:bg-surface-3 hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!preview || busy}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" strokeWidth={2.4} />
            )}
            Import workflow
          </button>
        </div>
      </div>
    </div>
  );
}
