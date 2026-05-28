/* ============================================================
   Dashboard welcome header — same shape as PageHeader but the title
   pulls the live account name from /v1/me, falling back to a
   server-supplied default so SSR renders sensibly while the client
   hydrates. Tiny and dashboard-only — every other PageHeader stays
   a pure server component.
   ============================================================ */

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

interface Props {
  /** Used during SSR + when the live account hasn't loaded yet. */
  fallbackName: string;
  eyebrow?: string;
  lead?: string;
  actions?: ReactNode;
}

/** First-name-ish derivation. "Acme Inc" → "Acme"; "JJ" → "JJ". */
function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export default function WelcomeHeader({
  fallbackName,
  eyebrow,
  lead,
  actions,
}: Props) {
  const [name, setName] = useState(fallbackName);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.whoami();
        if (cancelled) return;
        if (me.authenticated && me.account) {
          setName(firstWord(me.account.name));
        }
      } catch {
        /* swallow — fall back to the SSR title */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={`Welcome back, ${name}`}
      lead={lead}
      actions={actions}
    />
  );
}
