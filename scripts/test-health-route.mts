/* Test — Console liveness route (scripts/test-health-route.mts)
   Run: node --experimental-strip-types scripts/test-health-route.mts

   Verifies GET /api/health returns 200 with a stable liveness body.
   This is the canonical target for external uptime monitors — it lives
   on the console host, is public (the middleware matcher skips /api),
   and does NOT depend on the control plane. */

import assert from "node:assert/strict";
import { GET } from "../src/app/api/health/route.ts";

async function main() {
  const res = GET();
  assert.equal(res.status, 200, "should be 200");
  const body = (await res.json()) as {
    ok: boolean;
    service: string;
    time: string;
  };
  assert.equal(body.ok, true, "ok should be true");
  assert.equal(body.service, "cantila-console", "service should identify the console");
  assert.ok(
    typeof body.time === "string" && !Number.isNaN(Date.parse(body.time)),
    "time should be an ISO timestamp",
  );
  console.log("✓ GET /api/health → 200 { ok:true, service:'cantila-console', time }");
  console.log("\nHEALTH ROUTE TEST PASSED");
}

main().catch((err) => {
  console.error("\nHEALTH ROUTE TEST FAILED:");
  console.error(err);
  process.exit(1);
});
