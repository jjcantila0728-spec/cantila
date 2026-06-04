"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Monitor,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { cx } from "../ui";

/* ============================================================
   BrowserPreview — a browser-chrome wrapper around the live
   site iframe. Multiple page tabs (each with its own URL and
   web/mobile device mode), an editable address bar, reload, and
   open-external. No back/forward: the previewed site is
   cross-origin, so the parent frame can't read its internal
   navigation or drive history. Tab session persists per project.
   ============================================================ */

interface Tab {
  id: string;
  url: string;
  device: "web" | "mobile";
  nonce: number; // bump to force the iframe to remount (reload)
}

function labelFor(url: string): string {
  if (!url) return "new tab";
  try {
    const u = new URL(url);
    const p = u.pathname && u.pathname !== "/" ? u.pathname : u.host;
    return p.length > 20 ? p.slice(0, 19) + "…" : p;
  } catch {
    return url.length > 20 ? url.slice(0, 19) + "…" : url;
  }
}

function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export default function BrowserPreview({
  baseUrl,
  projectId,
}: {
  baseUrl: string | null;
  projectId: string;
}) {
  const storageKey = `cantila:preview-tabs:${projectId}`;
  const counter = useRef(1);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "t0", url: baseUrl ?? "", device: "web", nonce: 0 },
  ]);
  const [activeId, setActiveId] = useState("t0");
  const [hydrated, setHydrated] = useState(false);

  // Restore the saved tab session after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { tabs: Tab[]; activeId: string };
        if (saved.tabs?.length) {
          setTabs(saved.tabs.map((t) => ({ ...t, nonce: 0 })));
          setActiveId(
            saved.tabs.some((t) => t.id === saved.activeId)
              ? saved.activeId
              : saved.tabs[0].id,
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  // Fill the default tab's URL once the live domain resolves.
  useEffect(() => {
    if (!baseUrl) return;
    setTabs((prev) => prev.map((t) => (t.url === "" ? { ...t, url: baseUrl } : t)));
  }, [baseUrl]);

  // Persist the session.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ tabs, activeId }));
    } catch {
      /* ignore */
    }
  }, [tabs, activeId, hydrated, storageKey]);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const [addr, setAddr] = useState(active?.url ?? "");
  useEffect(() => {
    setAddr(active?.url ?? "");
  }, [active?.id, active?.url]);

  const update = useCallback(
    (id: string, patch: Partial<Tab>) =>
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [],
  );

  const newTab = useCallback(() => {
    const id = `t${counter.current++}`;
    setTabs((prev) => [...prev, { id, url: baseUrl ?? "", device: "web", nonce: 0 }]);
    setActiveId(id);
  }, [baseUrl]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev; // always keep one tab
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => (cur === id ? next[next.length - 1].id : cur));
      return next;
    });
  }, []);

  const go = useCallback(() => {
    if (!active) return;
    update(active.id, { url: normalizeUrl(addr), nonce: active.nonce + 1 });
  }, [active, addr, update]);

  const refresh = useCallback(() => {
    if (active) update(active.id, { nonce: active.nonce + 1 });
  }, [active, update]);

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-1.5 pt-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              title={t.url}
              className={cx(
                "flex h-7 min-w-0 max-w-[160px] shrink-0 items-center gap-1 rounded-none border-b-2 px-2 text-2xs",
                t.id === active?.id
                  ? "border-ember bg-surface text-ink"
                  : "border-transparent text-ink-dim hover:bg-surface-2",
              )}
            >
              <span className="truncate">{labelFor(t.url)}</span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Close tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(t.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-ink-faint hover:bg-bg hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={newTab}
          title="New tab"
          className="shrink-0 rounded p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <button
          onClick={refresh}
          title="Reload"
          className="rounded p-1 text-ink-dim hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder="https://…"
          spellCheck={false}
          className="h-7 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-2xs text-ink outline-none focus:border-ink-faint"
        />
        <div className="flex items-center rounded-md border border-border">
          <button
            onClick={() => active && update(active.id, { device: "web" })}
            title="Web"
            className={cx(
              "rounded-l-md p-1",
              active?.device === "web" ? "bg-surface-2 text-ink" : "text-ink-dim",
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => active && update(active.id, { device: "mobile" })}
            title="Mobile"
            className={cx(
              "rounded-r-md p-1",
              active?.device === "mobile" ? "bg-surface-2 text-ink" : "text-ink-dim",
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
        <a
          href={active?.url || "#"}
          target="_blank"
          rel="noreferrer"
          title="Open in new tab"
          className="rounded p-1 text-ink-dim hover:text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* iframe area */}
      <div className="min-h-0 flex-1 overflow-auto bg-bg">
        {!active?.url ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-dim">
            Not deployed yet — the live preview appears once a domain resolves.
          </div>
        ) : active.device === "web" ? (
          <iframe
            key={`${active.id}:${active.nonce}`}
            src={active.url}
            title="Live preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-start justify-center p-6">
            {/* iPhone 17 Pro — titanium frame, Dynamic Island, side
                buttons (action + volume left, power + Camera Control
                right). Screen is the device's true 402×874pt logical
                viewport so responsive sites hit their mobile breakpoint. */}
            <div className="relative shrink-0">
              {/* left rail buttons */}
              <div className="absolute -left-[2px] top-[118px] h-[34px] w-[3px] rounded-l-md bg-gradient-to-r from-[#8a8a90] to-[#55555b]" />{/* action */}
              <div className="absolute -left-[2px] top-[172px] h-[58px] w-[3px] rounded-l-md bg-gradient-to-r from-[#8a8a90] to-[#55555b]" />{/* vol up */}
              <div className="absolute -left-[2px] top-[242px] h-[58px] w-[3px] rounded-l-md bg-gradient-to-r from-[#8a8a90] to-[#55555b]" />{/* vol down */}
              {/* right rail buttons */}
              <div className="absolute -right-[2px] top-[122px] h-[44px] w-[3px] rounded-r-md bg-gradient-to-l from-[#c9c9cf] to-[#6f6f76]" />{/* Camera Control */}
              <div className="absolute -right-[2px] top-[206px] h-[92px] w-[3px] rounded-r-md bg-gradient-to-l from-[#8a8a90] to-[#55555b]" />{/* power */}

              {/* titanium frame */}
              <div className="rounded-[3.4rem] bg-[linear-gradient(135deg,#e2e2e7_0%,#9c9ca2_18%,#6c6c73_50%,#9c9ca2_82%,#e2e2e7_100%)] p-[3px] shadow-lift">
                {/* black bezel */}
                <div className="rounded-[3.2rem] bg-black p-[11px]">
                  {/* screen — true logical viewport */}
                  <div className="relative h-[874px] w-[402px] overflow-hidden rounded-[2.55rem] bg-white">
                    <iframe
                      key={`${active.id}:${active.nonce}`}
                      src={active.url}
                      title="Live preview (mobile)"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      className="h-full w-full border-0 bg-white"
                    />
                    {/* Dynamic Island */}
                    <div className="pointer-events-none absolute left-1/2 top-[11px] z-20 flex h-[31px] w-[120px] -translate-x-1/2 items-center justify-end gap-2.5 rounded-full bg-black pr-3.5">
                      <span className="h-[10px] w-[10px] rounded-full bg-[#0a0a14] ring-1 ring-[#23232b]" />
                    </div>
                    {/* home indicator */}
                    <div className="pointer-events-none absolute bottom-[9px] left-1/2 z-20 h-[5px] w-[138px] -translate-x-1/2 rounded-full bg-black/35" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
