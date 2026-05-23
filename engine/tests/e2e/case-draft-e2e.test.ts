import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { runCasesCompare } from "../../src/cli/cases-compare.ts";

describe("case-draft e2e (fixture replay)", () => {
  const base = join(repoRoot(), "engine/tests/fixtures/case-draft-e2e/expected");
  it("frozen claude vs codex manifests pass compare (no FAIL)", () => {
    const r = runCasesCompare({ leftDir: join(base, "claude", "2026-05-lanhu-cd882ee8"), rightDir: join(base, "codex", "2026-05-lanhu-cd882ee8"), threshold: 0.9 });
    expect(r.fail).toBe(false);
  });
});
