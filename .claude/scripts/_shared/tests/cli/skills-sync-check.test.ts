import { expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

test("kata skills sync-check runs all configured checks against the repository", () => {
  const result = spawnKataCli(["skills", "sync-check"]);
  const output = result.stdout + result.stderr;
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(output).toContain("runtime skill sync");
  expect(output).toContain("runtime detach");
  expect(output).toContain("skill structure check");
});
