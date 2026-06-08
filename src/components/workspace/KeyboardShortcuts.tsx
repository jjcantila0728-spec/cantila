"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const SECTIONS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "Editor",
    shortcuts: [
      { keys: ["⌘", "S"], description: "Save file" },
      { keys: ["⌘", "F"], description: "Search in file" },
    ],
  },
  {
    title: "Chat",
    shortcuts: [
      { keys: ["↵"], description: "Send message" },
      { keys: ["⇧", "↵"], description: "New line" },
      { keys: ["/"], description: "Open command menu" },
    ],
  },
  {
    title: "Workspace",
    shortcuts: [
      { keys: ["?"], description: "Show this overlay" },
      { keys: ["Esc"], description: "Close overlay / cancel" },
    ],
  },
];

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Keyboard shortcuts</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                {section.title}
              </div>
              <div className="space-y-1.5">
                {section.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-ink-dim">{s.description}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-surface-2 px-1.5 font-mono text-2xs text-ink"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
