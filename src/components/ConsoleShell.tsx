"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import Sidebar, { SidebarContent } from "./Sidebar";
import { cx } from "./ui";

/* ------------------------------------------------------------------
   Nav-drawer context.

   The mobile sidebar is a PUSH drawer, not an overlay: opening it
   slides the sidebar in from the left while shifting the entire page
   content to the right by the same width, so the two sit side by side
   rather than the sidebar floating on top of the page.

   Because the toggle lives in the Topbar (rendered as `children` here)
   and the push transform lives on the content wrapper, the open state
   is shared via context. Children passed to ConsoleShell sit inside the
   provider in the React tree, so the Topbar's useNavDrawer() resolves
   to this state.
   ------------------------------------------------------------------ */
type NavState = {
  /* mobile drawer */
  open: boolean;
  toggle: () => void;
  close: () => void;
  /* desktop collapse (lg+) */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const NavCtx = createContext<NavState>({
  open: false,
  toggle: () => {},
  close: () => {},
  collapsed: true,
  toggleCollapsed: () => {},
});

export const useNavDrawer = () => useContext(NavCtx);

/** A spring-y easing that drives only the mobile drawer aside; the content
 *  wrapper inlines its own transition-[padding,transform]. */
const PUSH =
  "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

export default function ConsoleShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Desktop sidebar collapse (lg+). Default collapsed; persisted so the
  // choice survives reloads and route changes. Read after mount to avoid
  // an SSR/localStorage mismatch.
  const [collapsed, setCollapsed] = useState(true);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("cantila:nav-collapsed");
      if (v !== null) setCollapsed(v === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("cantila:nav-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Lock body scroll + allow Escape to close while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ctx: NavState = {
    open,
    toggle: () => setOpen((o) => !o),
    close: () => setOpen(false),
    collapsed,
    toggleCollapsed,
  };

  return (
    <NavCtx.Provider value={ctx}>
      {/* `overflow-x-clip` swallows the off-canvas content while it's
          pushed, without creating a scroll container (so the Topbar's
          sticky positioning is unaffected). */}
      <div className="relative min-h-screen overflow-x-clip">
        {/* ambient ember glow anchored top-left of the canvas */}
        <div className="glow-ember pointer-events-none fixed inset-x-0 top-0 z-0 h-72" />

        {/* desktop sidebar (lg+) — static, reserves its column via the
            content's lg:pl-[240px] */}
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />

        {/* mobile push drawer — same width as the content shift below, so
            sidebar and page meet edge-to-edge with no overlap. */}
        <aside
          aria-hidden={!open}
          className={cx(
            "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border bg-surface shadow-lift lg:hidden",
            PUSH,
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </aside>

        {/* tap-to-close scrim over the (inactive) pushed content. Sits
            below the drawer (z-30) so the sidebar stays fully lit. */}
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className={cx(
            "fixed inset-0 z-20 bg-black/45 backdrop-blur-[1px] transition-opacity duration-300 motion-reduce:transition-none lg:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />

        {/* page content — on desktop the left padding tracks the sidebar
            width (240px expanded / 64px collapsed), animating in lockstep
            with the aside so expanding pushes the content right. On mobile
            it is pushed by the drawer width as before. */}
        <div
          className={cx(
            "relative z-10 lg:translate-x-0",
            collapsed ? "lg:pl-16" : "lg:pl-[240px]",
            "transition-[padding,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            open ? "translate-x-72" : "translate-x-0",
          )}
        >
          {children}
        </div>
      </div>
    </NavCtx.Provider>
  );
}
