"use client";

import { useState } from "react";
import { Plus, Globe, Lock, Link2 } from "lucide-react";
import { api, type ApiProjectDetail } from "../lib/api";
import { Pill, Button, cx } from "./ui";
import Modal, { Field, inputClass } from "./Modal";

export default function ProjectDomainsPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project, domains } = detail;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dnsHint, setDnsHint] = useState<{ type: string; name: string; value: string } | null>(
    null,
  );

  async function addDomain() {
    const hostname = name.trim().toLowerCase().replace(/\s+/g, "");
    if (!hostname || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await api.addDomain(project.id, hostname);
      setDnsHint(res.dns);
      setName("");
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not add domain");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Domains</h3>
        <button
          onClick={() => {
            setDnsHint(null);
            setOpen(true);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {domains.length === 0 ? (
        <p className="text-sm text-ink-faint">No domains attached.</p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <Globe className="h-4 w-4 shrink-0 text-info" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-ink">
                    {d.hostname}
                  </span>
                  {d.primary && <Pill tone="ember">Primary</Pill>}
                </div>
                <div className="mt-0.5 text-2xs text-ink-faint">
                  {d.kind === "subdomain" ? "Cantila subdomain" : "Custom domain"}
                </div>
              </div>
              <Pill tone={d.sslActive ? "live" : "warn"}>
                <Lock className="h-3 w-3" />
                {d.sslActive ? "SSL active" : "SSL issuing"}
              </Pill>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a domain"
        description="Cantila issues SSL and wires DNS automatically."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={addDomain} disabled={!name.trim() || saving}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {saving ? "Adding…" : "Add domain"}
            </Button>
          </>
        }
      >
        <Field label="Domain">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addDomain();
            }}
            placeholder="app.example.com"
            className={inputClass}
          />
        </Field>
        {dnsHint && (
          <div className="flex items-start gap-2 rounded-lg border border-border-soft bg-surface-2 p-3 text-2xs">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
            <div className="font-mono leading-relaxed text-ink-dim">
              <div>Add this DNS record at your registrar:</div>
              <div className="mt-1 text-ink">
                {dnsHint.type} {dnsHint.name} → {dnsHint.value}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
