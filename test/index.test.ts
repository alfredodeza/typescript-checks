import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/index.ts";

test("greet says hello", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});
