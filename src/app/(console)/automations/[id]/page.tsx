"use client";

/* Legacy /automations/[id] → /@handle/<name>. Automations share the
 * handle-based URL; the workspace branches on automationKind. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { resolveLegacyProjectUrl } from "@/lib/legacy-redirect";

export default function LegacyAutomationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  useEffect(() => {
    void (async () => {
      const target = await resolveLegacyProjectUrl(params.id);
      router.replace(target);
    })();
  }, [params.id, router]);
  return (
    <div className="flex h-[calc(100vh-12rem)] items-center justify-center gap-2 text-ink-faint">
      <Loader2 className="h-4 w-4 animate-spin" />
      Redirecting…
    </div>
  );
}
