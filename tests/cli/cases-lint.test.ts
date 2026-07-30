import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesLint } from "../../cli/lib/features-lint.ts";

function ws(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-fl-"));
  mkdirSync(join(root, "dataAssets", "features"), { recursive: true });
  return root;
}

function mkfeature(root: string, ...segments: string[]) {
  mkdirSync(join(root, "dataAssets", "features", ...segments), { recursive: true });
}

function mkValidActive(root: string, casesYaml: string): string {
  const dir = join("v7.0.0", "【客户】【模块】需求");
  mkfeature(root, dir, "cases");
  writeFileSync(join(root, "dataAssets", "features", dir, "cases", "需求.yaml"), casesYaml);
  return dir;
}

describe("features lint", () => {
  it("accepts a canonical active directory without feature metadata", () => {
    const root = ws();
    mkValidActive(root, "cases:\n  - id: C0001\n    title: 验证字段映射\n    priority: P1\n");
    expect(runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations).toHaveLength(
      0,
    );
  });

  it("flags legacy child version labels", () => {
    const root = ws();
    mkfeature(root, "v7.0.0", "【v700】【客户】【模块】需求");
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "legacy_version_label")).toBe(true);
  });

  it("flags residual metadata and manifests", () => {
    const root = ws();
    const dir = mkValidActive(root, "cases: []\n");
    const feature = join(root, "dataAssets", "features", dir);
    writeFileSync(join(feature, "metadata.yaml"), "id: retired\n");
    writeFileSync(join(feature, "manifest.json"), "{}\n");
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).toContain("feature_metadata_retired");
    expect(rules).toContain("manifest_residual");
  });

  it("flags retired meta.feature_id and meta.version", () => {
    const root = ws();
    mkValidActive(
      root,
      "meta:\n  feature_id: legacy\n  version: v7.0.0\ncases:\n  - id: C0001\n    title: 验证字段\n    priority: P1\n",
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).toContain("case_feature_id_retired");
    expect(rules).toContain("case_version_retired");
  });

  it("flags 待确认 markers but ignores 等待确认弹窗", () => {
    const root = ws();
    mkValidActive(root, "cases:\n  - id: C0001\n    title: 验证字段待确认\n");
    expect(
      runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.some(
        (v) => v.rule === "pending_confirmation",
      ),
    ).toBe(true);

    const safe = ws();
    mkValidActive(
      safe,
      "cases:\n  - id: C0001\n    title: 验证取消弹窗\n    steps:\n      - action: 点击【取消】关闭确认弹窗，等待确认弹窗关闭\n",
    );
    expect(
      runFeaturesLint({ project: "dataAssets", workspaceRoot: safe }).violations.some(
        (v) => v.rule === "pending_confirmation",
      ),
    ).toBe(false);
  });

  it("enforces authored active-case title and P0 ratio rules", () => {
    const root = ws();
    const cases = Array.from({ length: 8 }, (_, index) => {
      const priority = index === 0 ? "P0" : "P1";
      return `  - id: C${String(index + 1).padStart(4, "0")}\n    title: ${index === 0 ? "非验证标题" : `验证场景${index + 1}`}\n    priority: ${priority}`;
    }).join("\n");
    mkValidActive(root, `cases:\n${cases}\n`);
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).toContain("case_title_format");
    expect(rules).toContain("p0_ratio");
  });

  it("does not apply subjective case rules to standing features", () => {
    const root = ws();
    const dir = join("_standing", "【模块】常驻需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "cases", "常驻需求.yaml"),
      "cases:\n  - id: C0001\n    title: 新建规则成功\n    priority: P1\n",
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).not.toContain("case_title_format");
    expect(rules).not.toContain("p0_ratio");
  });

  it("flags invalid case filenames and real environment names", () => {
    const parent = mkdtempSync(join(tmpdir(), "kata-fl-env-"));
    const root = join(parent, "workspace");
    mkdirSync(join(root, "dataAssets", "features"), { recursive: true });
    mkdirSync(join(parent, "config", "env"), { recursive: true });
    writeFileSync(join(parent, "config", "env", "ltqc-local.yaml"), "base_url: https://x\n");
    const dir = join("v7.0.0", "【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "cases", "【模块】需求.yaml"),
      "cases:\n  - id: C0001\n    title: 验证连通\n    priority: P1\n    precondition: ltqc-local 已部署\n",
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).toContain("case_yaml_name");
    expect(rules).toContain("real_env_name");
  });
});
