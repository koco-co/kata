import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRepositoryPolicy } from "../../cli/lib/repository-policy.ts";

describe("repository policy", () => {
  it("rejects root temporary configs, legacy lib, scripts and misplaced case artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-"));
    mkdirSync(join(root, "config", "repos"), { recursive: true });
    writeFileSync(
      join(root, "config", "repos", "policy.yaml"),
      "root:\n  allowed_files: [package.json]\n  allowed_directories: [config, runtime, workspace]\nforbidden_globs: [kata-automation-*.config.ts, lib/**, workspace/**/automation/scripts/**]\ndependencies:\n  runtime_must_not_import: cli/\n",
    );
    const violations = checkRepositoryPolicy(root, [
      "package.json",
      "kata-automation-recheck.config.ts",
      "lib/db/index.ts",
      "workspace/dataAssets/features/v1/a/automation/scripts/probe.ts",
      "workspace/dataAssets/features/v1/a/cases/legacy.md",
      "workspace/dataAssets/features/v1/a/automation/tests/cases/C0001.spec.ts",
      "workspace/dataAssets/features/v1/a/automation/tests/sql/Bad_Name.sql",
    ]);
    expect(violations.map((item) => item.path)).toEqual([
      "kata-automation-recheck.config.ts",
      "lib/db/index.ts",
      "workspace/dataAssets/features/v1/a/automation/scripts/probe.ts",
      "workspace/dataAssets/features/v1/a/automation/tests/cases/C0001.spec.ts",
      "workspace/dataAssets/features/v1/a/automation/tests/sql/Bad_Name.sql",
      "workspace/dataAssets/features/v1/a/cases/legacy.md",
    ]);
  });

  it("accepts the registered YAML, test points, import, export and temporary run routes", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-policy-"));
    mkdirSync(join(root, "config", "repos"), { recursive: true });
    writeFileSync(
      join(root, "config", "repos", "policy.yaml"),
      "root:\n  allowed_files: [package.json]\n  allowed_directories: [config, runtime, workspace]\nforbidden_globs: [kata-automation-*.config.ts, lib/**, workspace/**/automation/scripts/**]\ndependencies:\n  runtime_must_not_import: cli/\n",
    );
    expect(
      checkRepositoryPolicy(root, [
        "package.json",
        "runtime/cases/parse.ts",
        "workspace/dataAssets/features/v1/a/cases/a.yaml",
        "workspace/dataAssets/features/v1/a/cases/test-points.md",
        "workspace/dataAssets/features/v1/a/cases/imports/history.csv",
        "workspace/dataAssets/features/v1/a/cases/exports/a.xmind",
        "workspace/dataAssets/features/v1/a/automation/tests/cases/c0001-create-rule.spec.ts",
        "workspace/dataAssets/features/v1/a/automation/tests/sql/base-tables.sql",
        "workspace/dataAssets/runs/run-1/_tmp/probe.ts",
      ]),
    ).toEqual([]);
  });
});
