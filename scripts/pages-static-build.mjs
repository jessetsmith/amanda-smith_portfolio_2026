#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function run(script) {
  const r = spawnSync(node, [join(root, "scripts", script)], {
    cwd: root,
    stdio: "inherit",
  });
  return r.status ?? 1;
}

const prep = run("pages-static-prepare.mjs");
if (prep !== 0) process.exit(prep);

const env = { ...process.env, GITHUB_PAGES: "1", NEXT_TELEMETRY_DISABLED: "1" };
const build = spawnSync("npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

const restore = run("pages-static-restore.mjs");
const code = build.status ?? 1;
if (restore !== 0 && code === 0) process.exit(restore);
process.exit(code);
