"use client";

import { useCallback, useRef } from "react";

interface Props {
  /** Which side the controlled panel is on, relative to this handle. */
  side: "left" | "right";
  width: number;
  min: number;
  max: number;
  defaultWidth: number;
  onChange: (w: number) => void;
}

/** A 12px-wide vertical drag handle. Mirrors ProjectWorkspace's pointer-
 *  capture resizer; double-click resets to defaultWidth. */
export default function Splitter({ side, width, min, max, defaultWidth, onChange }: Props) {
  const widthRef = useRef(width);
  widthRef.current = width;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = widthRef.current;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        // dragging toward the panel shrinks it: left panel grows with +delta,
        // right panel grows with -delta.
        const next = side === "left" ? startW + delta : startW - delta;
        onChange(Math.min(max, Math.max(min, next)));
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
    },
    [side, min, max, onChange],
  );

  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={() => onChange(defaultWidth)}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize · double-click to reset"
      className="hidden lg:flex w-3 shrink-0 cursor-col-resize items-center justify-center group"
    >
      <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-ember" />
    </div>
  );
}
