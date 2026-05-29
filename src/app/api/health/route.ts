/* ============================================================
   Console liveness probe — GET /api/health.

   The canonical target for external uptime monitors. Unlike a
   dashboard page (e.g. /databases), this is NOT session-gated — the
   middleware matcher skips `/api` — so an anonymous monitor gets a
   plain 200 instead of a 307 → /login (which reads as "down").

   Intentionally self-contained: it reports only that the Console is
   serving, with no dependency on the control plane. For an
   end-to-end console → control-plane check, monitor
   /api/cantila/v1/health instead.

   Uses the Web `Response.json` (not `NextResponse`) so the handler
   is a pure function — directly unit-testable without the Next
   runtime (see scripts/test-health-route.mts).
   ============================================================ */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json({
    ok: true,
    service: "cantila-console",
    time: new Date().toISOString(),
  });
}
