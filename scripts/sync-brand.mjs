#!/usr/bin/env node
/*
 * Brand-partial sync — keeps cantila-console/src/brand/tailwind.partial.ts
 * mirror of the canonical cantila/brand/tokens/tailwind.partial.ts when
 * this repo is checked out inside the cantila/ monorepo. In Coolify (or
 * any standalone clone where the canonical file is absent) the script
 * no-ops — the vendored copy is used as the source of truth.
 *
 * Why this exists: on the first console deploy of 2026-05-28 the Nixpacks
 * build failed with `Cannot find module '../brand/tokens/tailwind.partial'`
 * because tailwind.config.ts had been importing the brand partial from a
 * sibling directory of the monorepo that doesn't exist in the standalone
 * GitHub repo Coolify clones. The fix was to vendor a snapshot into
 * src/brand/. This script makes the snapshot stay in sync without
 * developers remembering to copy it manually.
 *
 * Wired as a "prebuild" npm script — runs before `next build` locally and
 * in CI. Safe by design: never fails when the canonical file is absent.
 */

import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const canonical = resolve(
  repoRoot,
  "..",
  "brand",
  "tokens",
  "tailwind.partial.ts",
);
const vendored = resolve(
  repoRoot,
  "src",
  "brand",
  "tailwind.partial.ts",
);

if (!existsSync(canonical)) {
  // Standalone clone (Coolify, fresh git clone of just the console repo).
  // The vendored copy is the source of truth here. Nothing to do.
  process.exit(0);
}

if (!existsSync(vendored)) {
  console.error(
    `[sync-brand] vendored copy missing at ${vendored} — refusing to overwrite a fresh checkout`,
  );
  process.exit(1);
}

const canonicalSrc = readFileSync(canonical, "utf8");
const vendoredSrc = readFileSync(vendored, "utf8");

// The vendored copy carries a "Vendored from …" header that the canonical
// does not. Strip leading comment blocks before comparing the actual
// `export const cantilaTheme` payload.
function stripLeadingComment(s) {
  const m = s.match(/^\/\*[\s\S]*?\*\/\s*/);
  return m ? s.slice(m[0].length) : s;
}

const canonicalBody = stripLeadingComment(canonicalSrc);
const vendoredBody = stripLeadingComment(vendoredSrc);

if (canonicalBody === vendoredBody) {
  process.exit(0);
}

// Out of sync — rewrite the vendored copy with the canonical body, but
// preserve the vendored header (its "single source of truth" comment is
// what tells future readers where to look).
const vendoredHeader = vendoredSrc.slice(
  0,
  vendoredSrc.length - vendoredBody.length,
);
const next = vendoredHeader + canonicalBody;
writeFileSync(vendored, next, "utf8");

const stat = statSync(canonical);
console.log(
  `[sync-brand] vendored copy refreshed from canonical ` +
    `(canonical mtime: ${stat.mtime.toISOString()})`,
);
