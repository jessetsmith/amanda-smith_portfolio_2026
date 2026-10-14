#!/usr/bin/env node
/**
 * Optional GitHub Pages static export helper.
 * Production is Vercel (full Next + /admin). Pages export cannot include
 * Route Handlers / middleware / admin, and cannot use `export const instant`
 * without Cache Components.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

const instantFiles = ["src/app/page.tsx", "src/app/cv/page.tsx"];

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

// Strip `export const instant` while Cache Components is off for output:export.
mkdirSync(join(stash, "instant-files"), { recursive: true });
for (const rel of instantFiles) {
  const from = join(root, rel);
  if (!existsSync(from)) continue;
  const original = readFileSync(from, "utf8");
  writeFileSync(join(stash, "instant-files", rel.replaceAll("/", "__")), original);
  const stripped = original
    .replace(/\n\/\*\*[^*]*\*\/\s*\nexport const instant = false;\n/g, "\n")
    .replace(/\nexport const instant = false;\n/g, "\n");
  writeFileSync(from, stripped);
  console.log(`stripped instant from ${rel}`);
}

writeFileSync(join(stash, ".prepared"), new Date().toISOString());
console.log("pages static prepare complete");
