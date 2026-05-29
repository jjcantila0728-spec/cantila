"use client";

/* ============================================================
   ProjectWorkspace — the home of a single project under
   /@handle/<name>. Two-column layout:
   - Left: ProjectChat (the agent team)
   - Right: tabbed surfaces — Overview / Assets / Brain / Open

   The workspace also hosts the build-on-arrival flow: when the
   route is reached with `?build=1`, the prompt is read from
   sessionStorage (`cantila:build-prompt:<projectId>`) and the
   chat boots in build mode, streaming op cards as the agents
   work.

   We deliberately do not re-implement the existing LiveProjectView
   panels — for now this surface focuses on the chat-first
   workflow. The legacy deploys / env / domains tabs remain
   reachable through the dedicated /projects pages and will be
   merged into the workspace tabs in a follow-up.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Brain,
  Image as ImageIcon,
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
import ProjectAssetGallery from "./ProjectAssetGallery";
import ProjectBrainPanel from "./ProjectBrainPanel";

type Tab = "chat" | "assets" | "brain";

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
  const [tab, setTab] = useState<Tab>("chat");
  const [pendingAssets, setPendingAssets] = useState<ApiProjectAsset[]>([]);

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

  /* Resolve the project from /@handle/<name>. */
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setDetail(null);
    (async () => {
      try {
        const d = await builderApi.getProjectByHandle(handle, projectName);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "project not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, projectName]);

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
      <div className="flex flex-1 min-h-0 gap-4">
        <div className="hidden flex-1 min-h-0 flex-col panel overflow-hidden p-0 lg:flex">
          <ProjectChat
            projectId={project.id}
            projectName={project.name}
            initialBuildPrompt={initialBuildPrompt}
            onAssetCreated={onAssetCreated}
          />
        </div>
        <div className="hidden w-[26rem] shrink-0 flex-col gap-3 lg:flex">
          <RightTabs tab={tab} setTab={setTab} />
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            {tab === "chat" && (
              <div className="text-sm text-ink-dim">
                The agent team chat is on the left. Use this column to inspect
                what they&apos;ve built so far.
              </div>
            )}
            {tab === "assets" && (
              <ProjectAssetGallery
                projectId={project.id}
                initialAssets={pendingAssets}
              />
            )}
            {tab === "brain" && <ProjectBrainPanel projectId={project.id} />}
          </div>
        </div>

        {/* mobile — stacked */}
        <div className="flex flex-1 min-h-0 flex-col gap-3 lg:hidden">
          <RightTabs tab={tab} setTab={setTab} mobile />
          {tab === "chat" && (
            <div className="flex-1 min-h-0 panel overflow-hidden p-0">
              <ProjectChat
                projectId={project.id}
                projectName={project.name}
                initialBuildPrompt={initialBuildPrompt}
                onAssetCreated={onAssetCreated}
              />
            </div>
          )}
          {tab === "assets" && (
            <ProjectAssetGallery
              projectId={project.id}
              initialAssets={pendingAssets}
            />
          )}
          {tab === "brain" && <ProjectBrainPanel projectId={project.id} />}
        </div>
      </div>
    </div>
  );
}

function RightTabs({
  tab,
  setTab,
  mobile,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  mobile?: boolean;
}) {
  const TABS: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
    { key: "chat", label: mobile ? "Chat" : "Working on it", icon: MessageSquare },
    { key: "assets", label: "Assets", icon: ImageIcon },
    { key: "brain", label: "Brain", icon: Brain },
  ];
  return (
    <div className="flex gap-1.5 rounded-xl border border-border bg-surface-2 p-1">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          className={cx(
            "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-2xs font-medium transition-colors",
            tab === key ? "bg-bg text-ink shadow-sm" : "text-ink-dim hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
