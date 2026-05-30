"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Lock, Loader2 } from "lucide-react";
import { api, type ApiEnvVar } from "../lib/api";
import { Pill, Button, cx } from "./ui";
import Modal, { Field, inputClass } from "./Modal";

export default function ProjectEnvPanel({ projectId }: { projectId: string }) {
  const [vars, setVars] = useState<ApiEnvVar[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    key: string;
    value: string;
    scope: ApiEnvVar["scope"];
    secret: boolean;
  }>({ key: "", value: "", scope: "all", secret: true });
  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setErr(null);
    try {
      const res = await api.listEnv(projectId);
      if (reqIdRef.current === reqId) {
        setVars(res.env);
      }
    } catch (e) {
      if (reqIdRef.current === reqId) {
        setErr(e instanceof Error ? e.message : "could not load env");
        setVars([]);
      }
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addVar() {
    const key = form.key.trim();
    if (!key || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api.setEnv(projectId, {
        key,
        value: form.value,
        secret: form.secret,
        scope: form.scope,
      });
      setForm({ key: "", value: "", scope: "all", secret: true });
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not save variable");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">
            Environment & secrets
          </h3>
          <p className="mt-0.5 text-2xs text-ink-faint">
            Encrypted at rest · applied on next deploy
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {vars === null ? (
        <div className="flex items-center gap-2 text-sm text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : vars.length === 0 ? (
        <p className="text-sm text-ink-faint">No variables set.</p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {vars.map((e) => (
            <li key={e.key} className="flex items-center gap-2 px-3 py-2.5">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-xs font-medium text-ink">
                {e.secret && <Lock className="h-3 w-3 shrink-0 text-ember" />}
                <span className="truncate">{e.key}</span>
              </span>
              <span className="truncate font-mono text-2xs text-ink-dim">
                {e.secret ? "••••••••" : e.value || "(empty)"}
              </span>
              <Pill tone={e.scope === "production" ? "ember" : "neutral"}>
                {e.scope}
              </Pill>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add environment variable"
        description="Scoped, encrypted at rest, applied on next deploy."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addVar} disabled={!form.key.trim() || saving}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {saving ? "Saving…" : "Add variable"}
            </Button>
          </>
        }
      >
        <Field label="Key">
          <input
            autoFocus
            value={form.key}
            onChange={(ev) => setForm({ ...form, key: ev.target.value.toUpperCase() })}
            placeholder="DATABASE_URL"
            className={cx(inputClass, "font-mono")}
          />
        </Field>
        <Field label="Value">
          <input
            value={form.value}
            onChange={(ev) => setForm({ ...form, value: ev.target.value })}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") void addVar();
            }}
            placeholder="postgres://…"
            className={cx(inputClass, "font-mono")}
          />
        </Field>
        <Field label="Scope">
          <select
            value={form.scope}
            onChange={(ev) =>
              setForm({ ...form, scope: ev.target.value as ApiEnvVar["scope"] })
            }
            className={inputClass}
          >
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="preview">Preview</option>
          </select>
        </Field>
        <label className="flex items-center justify-between">
          <span>
            <span className="kv">Secret</span>
            <span className="mt-0.5 block text-2xs text-ink-faint">
              Mask the value in the UI and logs.
            </span>
          </span>
          <input
            type="checkbox"
            checked={form.secret}
            onChange={() => setForm({ ...form, secret: !form.secret })}
            className="h-4 w-4 accent-ember"
          />
        </label>
      </Modal>
    </div>
  );
}
