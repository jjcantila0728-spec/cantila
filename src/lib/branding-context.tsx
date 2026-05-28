"use client";

/* ============================================================
   Branding context — plan §5.5 (white-label per-account
   branding).

   Fetches the active Account on mount, applies its brand colour
   as a CSS custom property on documentElement (so any component
   can use `var(--brand-primary, var(--ember))` as a brand
   override), updates the browser tab title to the brand display
   name, and exposes the live account via `useActiveAccount()`
   so the Sidebar can render the brand logo + display name when
   set.

   Renders its children inert when offline / unauthenticated —
   `useActiveAccount()` returns null and consumers fall back to
   the default Cantila chrome.
   ============================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type ApiAccount } from "@/lib/api";

interface BrandingContextValue {
  account: ApiAccount | null;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  account: null,
  refresh: async () => {},
});

export function useActiveAccount(): ApiAccount | null {
  return useContext(BrandingContext).account;
}

export function useBrandingRefresh(): () => Promise<void> {
  return useContext(BrandingContext).refresh;
}

export default function BrandingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [account, setAccount] = useState<ApiAccount | null>(null);

  async function load() {
    try {
      const acc = await api.getAccountMe();
      setAccount(acc);
    } catch {
      // Unauthenticated / offline — fall back to default chrome.
      setAccount(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Apply / clear CSS variables on the document root whenever the
  // active account's branding changes. The CSS vars are picked up by
  // components that opt into them via `var(--brand-primary,
  // var(--ember))` (etc.) — components that don't read them are
  // unaffected, so the existing chrome keeps working unchanged.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (account?.brandPrimaryColor) {
      root.style.setProperty("--brand-primary", account.brandPrimaryColor);
    } else {
      root.style.removeProperty("--brand-primary");
    }
    if (account?.brandAccentColor) {
      root.style.setProperty("--brand-accent", account.brandAccentColor);
    } else {
      root.style.removeProperty("--brand-accent");
    }
    if (account?.brandDisplayName) {
      document.title = `${account.brandDisplayName} · Console`;
    } else {
      document.title = "Cantila Console";
    }
    return () => {
      // Don't clean up on unmount — the layout is the only consumer
      // and unmounts only on full navigation, in which case the next
      // mount will overwrite anyway.
    };
  }, [account]);

  return (
    <BrandingContext.Provider value={{ account, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
}
