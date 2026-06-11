import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ALLOWED_FEATURE_ROOT_ENTRIES,
  compactToVersionDir,
  listFeatureDirs,
  resolveFeatureRunsDir,
  runsTmpDir,
  VERSION_DIR_RE,
} from "@shared/lib/features/layout.ts";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kata-layout-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("compactToVersionDir", () => {
  it("converts compact version to semantic dir name", () => {
    expect(compactToVersionDir("v6411")).toBe("v6.4.11");
    expect(compactToVersionDir("v647")).toBe("v6.4.7");
    expect(compactToVersionDir("v6410")).toBe("v6.4.10");
  });
  it("returns null for non-compact input", () => {
    expect(compactToVersionDir("v6.4.10")).toBeNull();
    expect(compactToVersionDir("2099")).toBeNull();
  });
});

describe("listFeatureDirs", () => {
  it("scans version layer, _standing, _archived and legacy flat dirs", () => {
    const features = join(root, "features");
    mkdirSync(join(features, "v6.4.11", "【v6411】【数据资产】适配lindorm"), { recursive: true });
    mkdirSync(join(features, "_standing", "2099-01-lt-dq-smoke"), { recursive: true });
    mkdirSync(join(features, "_archived", "v6.4.6", "【v646】【数据标准】DBC落标检查"), {
      recursive: true,
    });
    mkdirSync(join(features, "【v647】【数据质量】产品名称修改"), { recursive: true });
    writeFileSync(join(features, "INDEX.md"), "x", "utf-8");

    const entries = listFeatureDirs(features);
    const byZone = Object.groupBy(entries, (e) => e.zone);
    expect(byZone.active?.[0]).toMatchObject({
      group: "v6.4.11",
      dirName: "【v6411】【数据资产】适配lindorm",
    });
    expect(byZone.standing?.[0]?.group).toBe("_standing");
    expect(byZone.archived?.[0]?.group).toBe("_archived/v6.4.6");
    expect(byZone["legacy-flat"]?.[0]?.dirName).toBe("【v647】【数据质量】产品名称修改");
    expect(entries).toHaveLength(4); // INDEX.md 不计
  });
});

describe("area helpers", () => {
  it("builds three-area paths and whitelists root entries", () => {
    expect(runsTmpDir("/f")).toBe("/f/runs/_tmp");
    expect(VERSION_DIR_RE.test("v6.4.10")).toBe(true);
    expect(VERSION_DIR_RE.test("v6.4")).toBe(true);
    expect(VERSION_DIR_RE.test("_standing")).toBe(false);
    for (const n of ["metadata.yaml", "prd.md", "cases", "automation", "runs", "inputs"]) {
      expect(ALLOWED_FEATURE_ROOT_ENTRIES.has(n)).toBe(true);
    }
    expect(ALLOWED_FEATURE_ROOT_ENTRIES.has("results")).toBe(false);
    expect(ALLOWED_FEATURE_ROOT_ENTRIES.has("manifest.json")).toBe(false);
  });
});

describe("resolveFeatureRunsDir", () => {
  it("resolves runs/ dir for a feature in version layer", () => {
    const features = join(root, "features");
    mkdirSync(join(features, "v6.4.10", "2026-04-my-feature"), { recursive: true });
    const runsPath = resolveFeatureRunsDir(features, "2026-04-my-feature");
    expect(runsPath).toBe(join(features, "v6.4.10", "2026-04-my-feature", "runs"));
  });

  it("resolves runs/ dir for a legacy-flat feature", () => {
    const features = join(root, "features");
    mkdirSync(join(features, "【v647】【数据质量】旧功能"), { recursive: true });
    const runsPath = resolveFeatureRunsDir(features, "【v647】【数据质量】旧功能");
    expect(runsPath).toBe(join(features, "【v647】【数据质量】旧功能", "runs"));
  });

  it("throws 'feature not found' when featureId does not exist", () => {
    const features = join(root, "features");
    mkdirSync(features, { recursive: true });
    expect(() => resolveFeatureRunsDir(features, "nonexistent")).toThrow(
      "feature not found: nonexistent",
    );
  });
});
