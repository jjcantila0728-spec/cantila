"use client";

/* ============================================================
   Cantila Console — ⌘K command palette
   Fuzzy search across projects, deployments, pages and quick
   actions, with full keyboard navigation. Rendered through a
   portal to document.body so it layers above the fixed sidebar.
   ============================================================ */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  Rocket,
  Box,
  Database,
  Globe,
  UserPlus,
  GitCommitHorizontal,
} from "lucide-react";
import { NAV } from "./Sidebar";
import { cx, statusTone } from "./ui";
import { projects, deployments, getProject } from "@/lib/mock-data";

type CmdGroup = "Actions" | "Projects" | "Navigate" | "Deployments";

interface Cmd {
  id: string;
  group: CmdGroup;
  title: string;
  subtitle?: string;
  icon: typeof Box;
  href: string;
  /** Extra terms folded into the match haystack. */
  keywords: string;
  /** Optional status key — renders a tone dot on the icon tile. */
  status?: string;
}

/* ---------- static command sources ---------- */

const ACTION_CMDS: Cmd[] = [
  {
    id: "act-chat",
    group: "Actions",
    title: "New chat",
    subtitle: "Build, deploy, or change anything",
    icon: Rocket,
    href: "/chat",
    keywords: "create ship build chat deploy new launch change admin",
  },
  {
    id: "act-project",
    group: "Actions",
    title: "New project",
    subtitle: "Create an empty project",
    icon: Box,
    href: "/projects",
    keywords: "create new project app add",
  },
  {
    id: "act-database",
    group: "Actions",
    title: "New database",
    subtitle: "Provision Postgres, MySQL, Mongo or Redis",
    icon: Database,
    href: "/databases",
    keywords: "create new database postgres mysql mongo redis data provision",
  },
  {
    id: "act-domain",
    group: "Actions",
    title: "Add a domain",
    subtitle: "Connect a custom domain",
    icon: Globe,
    href: "/domains",
    keywords: "create add domain dns custom hostname",
  },
  {
    id: "act-invite",
    group: "Actions",
    title: "Invite teammate",
    subtitle: "Add someone to the workspace",
    icon: UserPlus,
    href: "/team",
    keywords: "invite team member add people user",
  },
];

const NAV_CMDS: Cmd[] = NAV.flatMap((group) =>
  group.items.map((item) => ({
    id: `nav-${item.href}`,
    group: "Navigate" as const,
    title: item.label,
    subtitle: `${group.heading} · ${item.href}`,
    icon: item.icon,
    href: item.href,
    keywords: `go to open page ${item.label} ${group.heading}`,
  })),
);

const PROJECT_CMDS: Cmd[] = projects.map((p) => ({
  id: `proj-${p.id}`,
  group: "Projects" as const,
  title: p.name,
  subtitle: `${p.type} · ${p.url}`,
  icon: Box,
  href: `/projects/${p.id}`,
  keywords: `project ${p.name} ${p.runtime} ${p.type} ${p.region} ${p.description}`,
  status: p.status,
}));

const DEPLOY_CMDS: Cmd[] = deployments.map((d) => {
  const project = getProject(d.projectId);
  return {
    id: `dep-${d.id}`,
    group: "Deployments" as const,
    title: d.commitMessage,
    subtitle: `${project?.name ?? d.projectId} · ${d.commitHash} · ${d.createdAt}`,
    icon: GitCommitHorizontal,
    href: `/projects/${d.projectId}`,
    keywords: `deployment deploy release ${d.commitMessage} ${d.commitHash} ${d.branch} ${d.trigger} ${project?.name ?? ""}`,
    status: d.status,
  };
});

/* Order here defines both match priority and the on-screen group order. */
const ALL_CMDS: Cmd[] = [
  ...ACTION_CMDS,
  ...PROJECT_CMDS,
  ...NAV_CMDS,
  ...DEPLOY_CMDS,
];

/** What to show before the user types anything. */
const DEFAULT_CMDS: Cmd[] = [
  ...ACTION_CMDS,
  ...PROJECT_CMDS.slice(0, 5),
  ...NAV_CMDS,
];

/* ---------- component ---------- */

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  /* filtered results — every whitespace term must match */
  const results = useMemo<Cmd[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEFAULT_CMDS;
    const terms = q.split(/\s+/);
    return ALL_CMDS.filter((c) => {
      const hay = `${c.title} ${c.subtitle ?? ""} ${c.keywords}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [query]);

  const safeActive = results.length
    ? Math.min(active, results.length - 1)
    : 0;

  /* reset state each time the palette opens */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* a new query always re-homes the selection */
  useEffect(() => {
    setActive(0);
  }, [query]);

  const select = useCallback(
    (cmd: Cmd) => {
      onClose();
      setQuery("");
      router.push(cmd.href);
    },
    [onClose, router],
  );

  /* keyboard: arrows move, enter opens, escape closes */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = results[Math.min(active, results.length - 1)];
        if (cmd) select(cmd);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose, select]);

  /* keep the active row visible */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${safeActive}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActive, results]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh]">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="panel relative w-full max-w-xl overflow-hidden p-0 animate-fade-up"
      >
        {/* search row */}
        <div className="flex items-center gap-3 border-b border-border-soft px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, deploys, pages, actions…"
            aria-label="Search the Console"
            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <Kbd>ESC</Kbd>
        </div>

        {/* results */}
        <div
          ref={listRef}
          className="max-h-[min(56vh,420px)] overflow-y-auto py-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-ink-dim">
                No matches for &ldquo;{query}&rdquo;.
              </p>
              <p className="mt-1 text-2xs text-ink-faint">
                Try a project name, a page, or a command.
              </p>
            </div>
          ) : (
            results.map((cmd, i) => {
              const prev = results[i - 1];
              const showHeader = !prev || prev.group !== cmd.group;
              const isActive = i === safeActive;
              const Icon = cmd.icon;
              return (
                <div key={cmd.id}>
                  {showHeader && (
                    <div
                      className={cx(
                        "px-4 pb-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint",
                        i === 0 ? "pt-1" : "pt-3",
                      )}
                    >
                      {cmd.group}
                    </div>
                  )}
                  <button
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => select(cmd)}
                    className={cx(
                      "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                      isActive ? "bg-surface-3" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cx(
                        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        isActive
                          ? "border-ember/40 bg-ember/10 text-ember"
                          : "border-border bg-surface-2 text-ink-faint",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cmd.status && (
                        <span
                          className={cx(
                            "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-surface",
                            statusTone(cmd.status).dot,
                          )}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {cmd.title}
                      </span>
                      {cmd.subtitle && (
                        <span className="block truncate font-mono text-2xs text-ink-faint">
                          {cmd.subtitle}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-4 border-t border-border-soft bg-surface px-4 py-2.5 text-2xs text-ink-faint">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span className="ml-0.5">navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            <span className="ml-0.5">open</span>
          </span>
          <span className="ml-auto font-mono">
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[0.6rem] text-ink-faint">
      {children}
    </kbd>
  );
}
