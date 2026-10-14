#!/usr/bin/env node
/**
 * GitHub Pages uses `output: 'export'`, which cannot include Route Handlers,
 * middleware, or cookie-gated admin. Park those trees during the Pages build
 * and restore afterward (see pages-static-restore.mjs).
 */
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stash = join(root, ".pages-export-stash");

const moves = [
  ["src/app/api", "api"],
  ["src/middleware.ts", "middleware.ts"],
  ["src/app/admin", "admin"],
  ["src/app/studio", "studio"],
];

if (existsSync(stash)) {
  rmSync(stash, { recursive: true, force: true });
}
mkdirSync(stash, { recursive: true });

for (const [rel, name] of moves) {
  const from = join(root, rel);
  if (!existsSync(from)) {
    console.log(`skip (missing): ${rel}`);
    continue;
  }
  const to = join(stash, name);
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  console.log(`stashed ${rel} -> .pages-export-stash/${name}`);
}

// Marker so restore is a no-op if prepare never ran
writeFileSync(join(stash, ".prepared"), new Date().toISOString());
console.log("pages static prepare complete");
