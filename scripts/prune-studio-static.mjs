#!/usr/bin/env node
/** Keep only files referenced by create-manifest.json under public/studio/static. */
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "studio",
  "static",
);
const manifestPath = join(dir, "create-manifest.json");
if (!existsSync(manifestPath)) process.exit(0);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const keep = new Set(["create-manifest.json"]);
for (const ws of manifest.workspaces || []) {
  if (ws.schema) keep.add(ws.schema);
  if (ws.tools) keep.add(ws.tools);
}

for (const name of readdirSync(dir)) {
  if (!keep.has(name)) {
    unlinkSync(join(dir, name));
    console.log(`pruned ${name}`);
  }
}
