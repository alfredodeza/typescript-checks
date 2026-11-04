// Checks that .gitignore keeps generated files out of Git: installed packages
// and build output are ignored, the source, tests and settings are not.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const here = import.meta.dirname;
const repo = mkdtempSync(path.join(tmpdir(), "gitignore-"));
const ignored = ["node_modules/typescript/package.json", "dist/index.js", "dist/index.d.ts", "tsconfig.tsbuildinfo"];
const kept = ["src/index.ts", "test/index.test.ts", "package.json", "package-lock.json", "tsconfig.json"];
try {
  cpSync(path.join(here, ".gitignore"), path.join(repo, ".gitignore"));
  spawnSync("git", ["init", "-q"], { cwd: repo });
  const r = spawnSync("git", ["check-ignore", ...ignored, ...kept], { cwd: repo, encoding: "utf8" });
  assert.deepEqual(r.stdout.trim().split("\n"), ignored);
} finally {
  rmSync(repo, { recursive: true, force: true });
}
console.log(`ignored: ${ignored.length} generated files (node_modules/, dist/, *.tsbuildinfo)`);
console.log(`kept:    ${kept.length} of your files (src/, test/, package.json, lock file, tsconfig)`);
console.log("contract: gitignore (generated files ignored, your own files kept) OK");
