import { expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

test("kata skills sync-check runs against the repository", () => {
  const result = spawnKataCli(["skills", "sync-check"]);
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(result.stdout + result.stderr).toContain("runtime skill sync");
});
