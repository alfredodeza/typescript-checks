// Checks that this template does what BRIEF.md asks, step by step. Any step
// that fails stops with an error, and the contract line never prints.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const here = import.meta.dirname;
const run = (cmd: string, args: string[], cwd = here) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

// Step 1: every tool pinned to an exact version; tsc is TypeScript 7.0.2.
const pkg = JSON.parse(readFileSync(path.join(here, "package.json"), "utf8"));
const pins = Object.entries(pkg.devDependencies as Record<string, string>);
for (const [name, version] of pins) {
  assert.match(version, /^\d+\.\d+\.\d+$/, `${name} must be pinned exactly, not ${version}`);
}
assert.equal(run("npx", ["tsc", "--version"]).out.trim(), "Version 7.0.2");
console.log(`Step 1: ${pins.length} tools pinned exactly, tsc 7.0.2`);

// Step 2: one command checks, lints, tests, checks formatting, builds.
rmSync(path.join(here, "dist"), { recursive: true, force: true });
const verify = run("npm", ["run", "verify"]);
assert.equal(verify.status, 0, verify.out);
console.log("Step 2: npm run verify passes");

// Step 3: the build wrote JavaScript and declarations, and it runs.
for (const file of ["dist/index.js", "dist/index.d.ts"]) {
  assert.ok(existsSync(path.join(here, file)), `${file} was not built`);
}
const built = run("node", ["--input-type=module", "-e", 'import { greet } from "./dist/index.js"; console.log(greet("Ada"));']);
assert.equal(built.out.trim(), "Hello, Ada!");
console.log("Step 3: dist/index.js and dist/index.d.ts built, and it runs");

// Step 4: each kind of mistake stops npm run verify at its own script.
const mistakes: [string, string, string][] = [
  ["a type error", "src/mistake.ts", 'export const n: number = "one";\n'],
  ["a floating promise", "src/mistake.ts", "async function save(): Promise<void> {}\nexport function run(): void {\n  save();\n}\n"],
  ["a failing test", "test/mistake.test.ts", 'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("fails", () => {\n  assert.equal(1, 2);\n});\n'],
  ["unformatted code", "src/mistake.ts", "export const x={a:1}\n"],
];
const stopsAt = ["check", "lint", "test", "format:check"];
const scratch = mkdtempSync(path.join(tmpdir(), "template-"));
try {
  mistakes.forEach(([what, file, code], k) => {
    const copy = path.join(scratch, String(k));
    cpSync(here, copy, { recursive: true, filter: (p) => !p.includes("node_modules") && !p.includes(`${path.sep}dist`) });
    symlinkSync(path.join(here, "node_modules"), path.join(copy, "node_modules"));
    writeFileSync(path.join(copy, file), code);
    const r = run("npm", ["run", "verify"], copy);
    assert.notEqual(r.status, 0, `${what} did not fail npm run verify`);
    const ran = stopsAt.filter((s) => r.out.includes(`> ${pkg.name}@${pkg.version} ${s}\n`));
    assert.equal(ran.at(-1), stopsAt[k], `${what} should stop at ${stopsAt[k]}, ran ${ran.join(", ")}`);
    assert.ok(!existsSync(path.join(copy, "dist")), `${what}: the build still ran`);
    console.log(`Step 4: ${what.padEnd(18)} stops at npm run ${stopsAt[k]}`);
  });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// Step 5: .gitignore keeps installed packages and build output out.
const repo = mkdtempSync(path.join(tmpdir(), "template-git-"));
try {
  cpSync(path.join(here, ".gitignore"), path.join(repo, ".gitignore"));
  run("git", ["init", "-q"], repo);
  const ignored = run("git", ["check-ignore", "node_modules/typescript/package.json", "dist/index.js", "src/index.ts"], repo);
  assert.deepEqual(ignored.out.trim().split("\n"), ["node_modules/typescript/package.json", "dist/index.js"]);
} finally {
  rmSync(repo, { recursive: true, force: true });
}
console.log("Step 5: git ignores node_modules/ and dist/, not src/");

console.log("contract: project template (pinned, verify passes, stops at first failure) OK");
