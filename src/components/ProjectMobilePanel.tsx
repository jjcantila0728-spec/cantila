"use client";

/* ============================================================
   ProjectMobilePanel — the Mobile ops tab. Builds Android
   artifacts (AAB/APK) via the control plane's mobile API,
   offers the signed artifact for download once a build
   succeeds, and publishes succeeded builds to Google Play
   tracks. iOS / App Store surfaces are stubbed "coming soon".
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { Hammer, Download, UploadCloud, Smartphone, Package } from "lucide-react";
import {
  api,
  builderApi,
  type ApiProjectDetail,
  type ApiMobileBuild,
  type ApiStoreRelease,
} from "../lib/api";
import { statusTone, cx } from "./ui";

type ArtifactKind = "aab" | "apk";
type ReleaseTrack = "internal" | "alpha" | "beta" | "production";

const TRACKS: ReleaseTrack[] = ["internal", "alpha", "beta", "production"];

/* Map mobile statuses onto the shared status vocabulary in ui.tsx
   (STATUS has no "succeeded"/"submitted" etc., so translate locally
   instead of editing ui.tsx). */
const BUILD_TONE: Record<string, { tone: string; label: string }> = {
  queued: { tone: "queued", label: "Queued" },
  building: { tone: "building", label: "Building" },
  succeeded: { tone: "live", label: "Succeeded" },
  failed: { tone: "failed", label: "Failed" },
};

const RELEASE_TONE: Record<string, { tone: string; label: string }> = {
  submitted: { tone: "queued", label: "Submitted" },
  published: { tone: "live", label: "Published" },
  stubbed: { tone: "rolled-back", label: "Recorded (publisher offline)" },
  failed: { tone: "failed", label: "Failed" },
};

function ToneBadge({ status, map }: { status: string; map: Record<string, { tone: string; label: string }> }) {
  const m = map[status] ?? { tone: "paused", label: status };
  const t = statusTone(m.tone);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-medium ring-1",
        t.bg,
        t.text,
        t.ring,
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", t.dot)} />
      {m.label}
    </span>
  );
}

/** "3m ago" / "2h ago" / "5d ago", falling back to a date for older items. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** "412 KB" / "23.4 MB" */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectMobilePanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project } = detail;
  const [builds, setBuilds] = useState<ApiMobileBuild[] | null>(null);
  const [releases, setReleases] = useState<ApiStoreRelease[] | null>(null);
  const [artifactKind, setArtifactKind] = useState<ArtifactKind>("aab");
  const [tracks, setTracks] = useState<Record<string, ReleaseTrack>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const aliveRef = useRef(true);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([
        api.listMobileBuilds(project.id),
        api.listStoreReleases(project.id),
      ]);
      if (aliveRef.current) {
        loadedRef.current = true;
        setBuilds(b.builds);
        setReleases(r.releases);
      }
    } catch (e) {
      // first load failed — surface the error; later polls keep the last
      // good lists instead.
      if (aliveRef.current && !loadedRef.current) {
        setBuilds([]);
        setReleases([]);
        setErr(e instanceof Error ? e.message : "failed to load mobile builds");
      }
    }
  }, [project.id]);

  useEffect(() => {
    aliveRef.current = true;
    void load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  // While a build is queued/building, poll every 4s so the row flips to
  // succeeded/failed without a manual refresh.
  const hasActiveBuild =
    builds?.some((b) => b.status === "queued" || b.status === "building") ?? false;
  useEffect(() => {
    if (!hasActiveBuild) return;
    const t = window.setInterval(() => void load(), 4_000);
    return () => window.clearInterval(t);
  }, [hasActiveBuild, load]);

  async function run(label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(label);
    setErr(null);
    try {
      await fn();
      await load();
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(null);
    }
  }

  const loading = builds === null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">
          Mobile builds
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={artifactKind}
            onChange={(e) => setArtifactKind(e.target.value as ArtifactKind)}
            disabled={busy !== null}
            title="Artifact kind"
            className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
          >
            <option value="aab">AAB (Play Store)</option>
            <option value="apk">APK (direct install)</option>
          </select>
          <button
            onClick={() =>
              run("build", () =>
                api.buildMobile(project.id, { platform: "android", artifactKind }),
              )
            }
            disabled={busy !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-medium text-[#1a0e08] hover:bg-ember-bright disabled:opacity-60"
          >
            <Hammer className={cx("h-3.5 w-3.5", busy === "build" && "animate-spin")} />
            Build Android app
          </button>
          <span
            title="iOS builds are coming soon"
            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full bg-surface-3 px-3 text-2xs font-medium text-ink-faint ring-1 ring-border"
          >
            <Smartphone className="h-3.5 w-3.5" />
            iOS — Coming soon
          </span>
        </div>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading mobile builds…</p>
      ) : builds.length === 0 ? (
        <p className="text-sm text-ink-faint">
          No mobile builds yet. Build an Android app to get a signed{" "}
          {artifactKind === "aab" ? "App Bundle" : "APK"} you can download or
          publish to Google Play.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {builds.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <Package className="h-4 w-4 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-ink">
                  v{b.versionName} (code {b.versionCode})
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-2xs text-ink-faint">
                  <span>{b.mobileStack}</span>
                  <span>· {b.artifactKind.toUpperCase()}</span>
                  {typeof b.artifactSize === "number" && (
                    <span>· {formatSize(b.artifactSize)}</span>
                  )}
                  {b.createdAt && (
                    <span title={new Date(b.createdAt).toLocaleString()}>
                      · {timeAgo(b.createdAt)}
                    </span>
                  )}
                </div>
                {b.status === "failed" && b.error && (
                  <div className="mt-0.5 truncate text-2xs text-down" title={b.error}>
                    {b.error}
                  </div>
                )}
              </div>
              <ToneBadge status={b.status} map={BUILD_TONE} />
              {b.status === "succeeded" && (
                <div className="flex items-center gap-2">
                  <a
                    href={builderApi.mobileArtifactHref(project.id, b.id)}
                    download
                    title={`Download the ${b.artifactKind.toUpperCase()} artifact`}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                  <select
                    value={tracks[b.id] ?? "internal"}
                    onChange={(e) =>
                      setTracks((cur) => ({ ...cur, [b.id]: e.target.value as ReleaseTrack }))
                    }
                    disabled={busy !== null}
                    title="Google Play track"
                    className="h-7 rounded-lg border border-border bg-surface-2 px-1.5 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
                  >
                    {TRACKS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      run(`publish:${b.id}`, () =>
                        api.publishMobileRelease(project.id, {
                          buildId: b.id,
                          store: "google_play",
                          track: tracks[b.id] ?? "internal",
                        }),
                      )
                    }
                    disabled={busy !== null}
                    title="Publish this build to Google Play"
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
                  >
                    <UploadCloud
                      className={cx("h-3 w-3", busy === `publish:${b.id}` && "animate-spin")}
                    />
                    Publish to Google Play
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="pt-1 font-display text-sm font-semibold text-ink">
        Store releases
      </h3>
      {releases === null ? (
        <p className="text-sm text-ink-faint">Loading releases…</p>
      ) : releases.length === 0 ? (
        <p className="text-sm text-ink-faint">
          No store releases yet. Publish a succeeded build to a Google Play track.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {releases.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <UploadCloud className="h-4 w-4 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-ink">
                  {r.store === "google_play" ? "Google Play" : "App Store"} ·{" "}
                  <span className="font-mono">{r.track}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-2xs text-ink-faint">
                  <span>build {r.buildId.slice(0, 12)}</span>
                  {r.externalRef && <span>· ref {r.externalRef}</span>}
                  {r.createdAt && (
                    <span title={new Date(r.createdAt).toLocaleString()}>
                      · {timeAgo(r.createdAt)}
                    </span>
                  )}
                </div>
                {r.error && (
                  <div className="mt-0.5 truncate text-2xs text-down" title={r.error}>
                    {r.error}
                  </div>
                )}
              </div>
              <ToneBadge status={r.status} map={RELEASE_TONE} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
