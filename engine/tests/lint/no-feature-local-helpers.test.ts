import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintNoFeatureLocalHelpers } from "@shared/lint/no-feature-local-helpers.ts";

describe("gate: no_feature_local_helpers", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-helpers-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("reports any file under features/*/tests/helpers/", () => {
    const dir = join(scratch, "dataAssets/features/2026-04-x/tests/helpers");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "foo.ts"), "export {}");
    const r = lintNoFeatureLocalHelpers(scratch);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].rule).toBe("feature_local_helper");
  });

  it("passes when helpers dir is empty or missing", () => {
    mkdirSync(join(scratch, "dataAssets/features/2026-04-x/tests"), { recursive: true });
    const r = lintNoFeatureLocalHelpers(scratch);
    expect(r.violations).toHaveLength(0);
  });
});
