"use client";

/* ============================================================
   useIsOwner — true only for the Cantila owner email.
   Reads the signed-in user via api.whoami() once and caches the
   result in a module-level promise so every consumer hooks into
   the same lookup. The owner email is overridable via
   NEXT_PUBLIC_CANTILA_OWNER_EMAIL; the fallback is the founder
   address. The check is intentionally case-insensitive and
   trims whitespace because email comparisons are a classic
   source of false negatives.
   ============================================================ */

import { useEffect, useState } from "react";
import { api } from "./api";

const FALLBACK_OWNER = "jjcantila0728@gmail.com";

const OWNER_EMAIL = (
  process.env.NEXT_PUBLIC_CANTILA_OWNER_EMAIL ?? FALLBACK_OWNER
)
  .trim()
  .toLowerCase();

let cachedEmail: Promise<string | null> | null = null;

function fetchEmail(): Promise<string | null> {
  if (!cachedEmail) {
    cachedEmail = (async () => {
      try {
        const me = await api.whoami();
        if (!me.authenticated) return null;
        return me.user?.email?.trim().toLowerCase() ?? null;
      } catch {
        return null;
      }
    })();
  }
  return cachedEmail;
}

/** Resets the cache — used by sign-out flows or by tests. */
export function resetOwnerCache(): void {
  cachedEmail = null;
}

export function useIsOwner(): boolean {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetchEmail().then((email) => {
      if (cancelled) return;
      setIsOwner(email !== null && email === OWNER_EMAIL);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return isOwner;
}
