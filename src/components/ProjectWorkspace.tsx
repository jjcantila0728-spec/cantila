"use client";

/* ============================================================
   ProjectWorkspace — the home of a single project under
   /@handle/<name>. A chat-first layout:
   - Left: ProjectChat (the agent team)
   - Right: a resizable rail whose horizontally-scrollable tab
     strip hosts the operational surfaces — Overview (default) /
     Assets / Brain / Deploys / Logs / Environment / Domains /
     Settings — all wired to the real control-plane `api`.

   The workspace also hosts the build-on-arrival flow: when the
   route is reached with `?build=1`, the prompt is read from
   sessionStorage (`cantila:build-prompt:<projectId>`) and the
   chat boots in build mode, streaming op cards as the agents
   work.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Image as ImageIcon,
  Brain,
  Rocket,
  ScrollText,
  KeyRound,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import {
  builderApi,
  type ApiProjectDetail,
  type ApiProjectAsset,
} from "../lib/api";
import { cx, StatusBadge } from "./ui";
import ProjectChat from "./ProjectChat";
import ProjectAssetGallery from "./ProjectAssetGallery";
import ProjectBrainPanel from "./ProjectBrainPanel";
import ProjectOverviewPanel from "./ProjectOverviewPanel";
import ProjectDeploysPanel from "./ProjectDeploysPanel";
import ProjectLogsPanel from "./ProjectLogsPanel";
import ProjectEnvPanel from "./ProjectEnvPanel";
import ProjectDomainsPanel from "./ProjectDomainsPanel";
import ProjectSettingsPanel from "./ProjectSettingsPanel";

type Tab =
  | "overview"
  | "assets"
  | "brain"
  | "deploys"
  | "logs"
  | "env"
  | "domains"
  | "settings";

const RAIL_DEFAULT = 416; // 26rem
const RAIL_MIN = 352; // 22rem
const RAIL_MAX = 768; // 48rem
const RAIL_KEY = "cantila:workspace-rail-w";

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
  const [tab, setTab] = useState<Tab>("overview");
  const [pendingAssets, setPendingAssets] = useState<ApiProjectAsset[]>([]);

  /* Resizable rail width (lg+). Read from localStorage after mount. */
  const [railW, setRailW] = useState(RAIL_DEFAULT);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(RAIL_KEY);
      if (v) {
        const n = Number(v);
        if (!Number.isNaN(n)) setRailW(Math.min(RAIL_MAX, Math.max(RAIL_MIN, n)));
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(RAIL_KEY, String(railW));
    } catch {
      /* ignore */
    }
  }, [railW]);

  const railWRef = useRef(railW);
  railWRef.current = railW;
  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = railWRef.current;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(
        RAIL_MAX,
        Math.max(RAIL_MIN, startW - (ev.clientX - startX)),
      );
      setRailW(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.releasePointerCapture?.(e.pointerId);
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.userSelect = "none";
  }, []);

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

  const onAssetCreated = useCallback((asset: ApiProjectAsset) => {
    setPendingAssets((prev) => [...prev, asset]);
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
    <div className="flex h-[calc(100vh-9rem)] min-h-[600px] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="kv mb-1 flex items-center gap-2 text-ember">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            <span className="text-ink-faint">/</span>
            <Link href={`/`} className="hover:underline">
              @{handle}
            </Link>
          </div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-ink">
            {project.name}
            <StatusBadge status={project.status} />
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            {project.runtime} · {project.region} · {project.slug}.cantila.app
          </p>
        </div>
        <div className="flex gap-2">
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
          <Link
            href={`/projects/live/${project.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 text-sm font-medium text-ink hover:border-ink-faint"
          >
            Full console
          </Link>
        </div>
      </div>

      {/* Body — split layout on desktop, tabs on mobile */}
      <div className="flex flex-1 min-h-0 gap-0">
        <div className="hidden flex-1 min-h-0 flex-col panel overflow-hidden p-0 lg:flex">
          <ProjectChat
            projectId={project.id}
            projectName={project.name}
            initialBuildPrompt={initialBuildPrompt}
            onAssetCreated={onAssetCreated}
          />
        </div>

        {/* drag handle */}
        <div
          onPointerDown={startResize}
          onDoubleClick={() => setRailW(RAIL_DEFAULT)}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize · double-click to reset"
          className="hidden lg:flex w-3 shrink-0 cursor-col-resize items-center justify-center group"
        >
          <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-ember" />
        </div>

        <div
          className="hidden shrink-0 flex-col gap-3 lg:flex"
          style={{ width: railW }}
        >
          <RightTabs tab={tab} setTab={setTab} />
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            <RailContent
              tab={tab}
              detail={detail}
              pendingAssets={pendingAssets}
              onRefresh={() => load({ silent: true })}
            />
          </div>
        </div>

        {/* mobile — stacked */}
        <div className="flex flex-1 min-h-0 flex-col gap-3 lg:hidden">
          <RightTabs tab={tab} setTab={setTab} mobile />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <RailContent
              tab={tab}
              detail={detail}
              pendingAssets={pendingAssets}
              onRefresh={() => load({ silent: true })}
              mobileChat={
                <div className="flex-1 min-h-0 panel overflow-hidden p-0">
                  <ProjectChat
                    projectId={project.id}
                    projectName={project.name}
                    initialBuildPrompt={initialBuildPrompt}
                    onAssetCreated={onAssetCreated}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const TAB_DEFS: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "assets", label: "Assets", icon: ImageIcon },
  { key: "brain", label: "Brain", icon: Brain },
  { key: "deploys", label: "Deploys", icon: Rocket },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "env", label: "Env", icon: KeyRound },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "settings", label: "Settings", icon: SlidersHorizontal },
];

function RightTabs({
  tab,
  setTab,
  mobile,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1">
      {TAB_DEFS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          title={label}
          className={cx(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-2xs font-medium transition-colors",
            tab === key ? "bg-bg text-ink shadow-sm" : "text-ink-dim hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className={mobile ? "" : "hidden xl:inline"}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function RailContent({
  tab,
  detail,
  pendingAssets,
  onRefresh,
  mobileChat,
}: {
  tab: Tab;
  detail: ApiProjectDetail | null;
  pendingAssets: ApiProjectAsset[];
  onRefresh: () => Promise<void>;
  mobileChat?: React.ReactNode;
}) {
  if (!detail) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }
  const projectId = detail.project.id;
  const panel = (() => {
    switch (tab) {
      case "overview":
        return <ProjectOverviewPanel detail={detail} onRefresh={onRefresh} />;
      case "assets":
        return <ProjectAssetGallery projectId={projectId} initialAssets={pendingAssets} />;
      case "brain":
        return <ProjectBrainPanel projectId={projectId} />;
      case "deploys":
        return <ProjectDeploysPanel detail={detail} onRefresh={onRefresh} />;
      case "logs":
        return <ProjectLogsPanel projectId={projectId} />;
      case "env":
        return <ProjectEnvPanel projectId={projectId} />;
      case "domains":
        return <ProjectDomainsPanel detail={detail} onRefresh={onRefresh} />;
      case "settings":
        return <ProjectSettingsPanel detail={detail} onRefresh={onRefresh} />;
      default:
        return null;
    }
  })();
  return (
    <div className="space-y-3">
      {mobileChat}
      {panel}
    </div>
  );
}
