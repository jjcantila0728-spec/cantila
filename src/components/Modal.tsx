"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* shared input chrome used across every create form */
export const inputClass =
  "h-9 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="kv">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-2xs text-ink-faint">{hint}</p>}
    </label>
  );
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  /* portal target only exists after mount — keeps SSR happy */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  /* portal to <body> so the overlay clears the fixed sidebar (z-30) */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="panel relative w-full max-w-md rounded-b-none p-0 animate-fade-up sm:rounded-b-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-2xs text-ink-faint">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
