"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { api, type ApiProjectDetail } from "../lib/api";
import { cx } from "./ui";

const VCPU = [1, 2, 4, 8];
const MEM_GB = [1, 2, 4, 8, 16];
const DISK_GB = [10, 20, 50];

export default function ProjectSettingsPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project } = detail;
  const [vcpu, setVcpu] = useState(project.vcpu);
  const [memGb, setMemGb] = useState(project.memoryMb / 1024);
  const [diskGb, setDiskGb] = useState(project.diskGb);
  const [alwaysOn, setAlwaysOn] = useState(project.alwaysOn);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const dirty =
    vcpu !== project.vcpu ||
    memGb !== project.memoryMb / 1024 ||
    diskGb !== project.diskGb ||
    alwaysOn !== project.alwaysOn;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setErr(null);
    setOk(false);
    try {
      await api.scale(project.id, {
        vcpu,
        memoryMb: memGb * 1024,
        diskGb,
        alwaysOn,
      });
      await onRefresh();
      setOk(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-ink">Compute</h3>

      <Choice label="vCPU" unit="cores" options={VCPU} value={vcpu} onChange={setVcpu} />
      <Choice label="Memory" unit="GB" options={MEM_GB} value={memGb} onChange={setMemGb} />
      <Choice label="Disk" unit="GB" options={DISK_GB} value={diskGb} onChange={setDiskGb} />

      <div className="flex items-center justify-between border-t border-border-soft pt-3">
        <div>
          <div className="text-sm text-ink">Always-on</div>
          <div className="text-2xs text-ink-faint">
            Keep one instance pinned for production traffic.
          </div>
        </div>
        <button
          onClick={() => setAlwaysOn((v) => !v)}
          role="switch"
          aria-checked={alwaysOn}
          className={cx(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
            alwaysOn ? "bg-ember" : "bg-surface-3",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-transform",
              alwaysOn ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {err && <div className="text-2xs text-down">{err}</div>}
      {ok && !dirty && <div className="text-2xs text-live">Saved.</div>}

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:cursor-default disabled:opacity-60"
      >
        <Save className="h-4 w-4" strokeWidth={2.2} />
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function Choice({
  label,
  unit,
  options,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  options: number[];
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-ink-dim">{label}</span>
        <span className="font-mono text-ink">
          {value} {unit}
        </span>
      </div>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cx(
              "h-8 flex-1 rounded-lg border text-2xs font-medium transition-colors",
              o === value
                ? "border-ember bg-ember/10 text-ink"
                : "border-border bg-surface-2 text-ink-dim hover:border-ink-faint",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
