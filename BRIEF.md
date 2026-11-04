# A reusable project template

Start every new TypeScript 7 project from this folder.

It must:

1. Pin every tool to an exact version: TypeScript 7.0.2, @types/node,
   oxlint with oxlint-tsgolint, and Prettier.
2. Check, lint, test, check formatting and build with one command:
   `npm run verify`.
3. Build `src/` into JavaScript and type declarations in `dist/`.
4. Stop at the first step that fails, with a non-zero exit code.
5. Keep generated files out of Git: `node_modules/` and `dist/`.

`node check.ts` checks all five, and prints its contract line last.
