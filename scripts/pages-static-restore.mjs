#!/usr/bin/env node
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stash = join(root, ".pages-export-stash");

const moves = [
  ["api", "src/app/api"],
  ["middleware.ts", "src/middleware.ts"],
  ["admin", "src/app/admin"],
  ["studio", "src/app/studio"],
];

const instantFiles = ["src/app/page.tsx", "src/app/cv/page.tsx"];

if (!existsSync(join(stash, ".prepared"))) {
  console.log("nothing to restore");
  process.exit(0);
}

for (const [name, rel] of moves) {
  const from = join(stash, name);
  const to = join(root, rel);
  if (!existsSync(from)) {
    console.log(`skip (missing stash): ${name}`);
    continue;
  }
  if (existsSync(to)) {
    rmSync(to, { recursive: true, force: true });
  }
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  console.log(`restored ${rel}`);
}

for (const rel of instantFiles) {
  const backup = join(stash, "instant-files", rel.replaceAll("/", "__"));
  if (!existsSync(backup)) continue;
  writeFileSync(join(root, rel), readFileSync(backup));
  console.log(`restored instant in ${rel}`);
}

rmSync(stash, { recursive: true, force: true });
console.log("pages static restore complete");
