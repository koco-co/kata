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

/** 正式 feature 最小合法夹具: metadata + 一个 cases yaml; 返回 yaml 路径便于覆写内容。 */
function mkValidActive(root: string, casesYaml: string): void {
  const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
  mkfeature(root, dir, "cases");
  writeFileSync(join(root, "dataAssets", "features", dir, "metadata.yaml"), "id: 202607-01-demo\n");
  writeFileSync(join(root, "dataAssets", "features", dir, "cases", "需求.yaml"), casesYaml);
}

describe("features lint", () => {
  it("flags active feature dirs missing metadata.yaml", () => {
    const root = ws();
    mkfeature(root, "v7.0.0", "【v700】【客户】【模块】需求", "cases");
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "metadata_missing")).toBe(true);
  });

  it("accepts active feature dirs with valid metadata", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations).toHaveLength(0);
  });

  it("flags 待确认 markers in active feature case yaml", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\n",
    );
    writeFileSync(
      join(root, "dataAssets", "features", dir, "cases", "需求.yaml"),
      "cases:\n  - id: C001\n    title: 验证字段映射待确认\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "pending_confirmation")).toBe(true);
  });

  it("ignores 待确认 inside 等待确认弹窗 step text", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\n",
    );
    writeFileSync(
      join(root, "dataAssets", "features", dir, "cases", "需求.yaml"),
      "cases:\n  - id: C001\n    title: 验证取消弹窗\n    steps:\n      - action: 点击【取消】关闭确认弹窗，等待确认弹窗关闭\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "pending_confirmation")).toBe(false);
  });

  it("accepts case yaml without 待确认 markers", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\n",
    );
    writeFileSync(
      join(root, "dataAssets", "features", dir, "cases", "需求.yaml"),
      "cases:\n  - id: C001\n    title: 验证字段映射已按 prd 确认\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations).toHaveLength(0);
  });

  it("flags active-feature case titles not starting with 验证", () => {
    const root = ws();
    mkValidActive(root, "cases:\n  - id: C001\n    title: 新建规则成功\n    priority: P1\n");
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "case_title_format")).toBe(true);
  });

  it("flags P0 ratio outside [20%,40%] when cases >= 8", () => {
    const root = ws();
    const cases = Array.from({ length: 8 }, (_, i) => {
      const p = i === 0 ? "P0" : "P1";
      return `  - id: C${String(i + 1).padStart(3, "0")}\n    title: 验证场景${i + 1}\n    priority: ${p}`;
    }).join("\n");
    mkValidActive(root, `cases:\n${cases}\n`);
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "p0_ratio")).toBe(true);
  });

  it("accepts P0 ratio inside the band and skips small case sets", () => {
    const root = ws();
    const cases = Array.from({ length: 8 }, (_, i) => {
      const p = i < 2 ? "P0" : "P1";
      return `  - id: C${String(i + 1).padStart(3, "0")}\n    title: 验证场景${i + 1}\n    priority: ${p}`;
    }).join("\n");
    mkValidActive(root, `cases:\n${cases}\n`);
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "p0_ratio")).toBe(false);

    const small = ws();
    mkValidActive(small, "cases:\n  - id: C001\n    title: 验证唯一场景\n    priority: P1\n");
    const smallResult = runFeaturesLint({ project: "dataAssets", workspaceRoot: small });
    expect(smallResult.violations.some((v) => v.rule === "p0_ratio")).toBe(false);
  });

  it("flags case yaml filenames containing 【】", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\n",
    );
    writeFileSync(
      join(root, "dataAssets", "features", dir, "cases", "【v700】需求.yaml"),
      "cases:\n  - id: C001\n    title: 验证字段映射\n    priority: P1\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "case_yaml_name")).toBe(true);
  });

  it("flags real env names from config/env in case yaml", () => {
    const parent = mkdtempSync(join(tmpdir(), "kata-fl-env-"));
    const root = join(parent, "workspace");
    mkdirSync(join(root, "dataAssets", "features"), { recursive: true });
    mkdirSync(join(parent, "config", "env"), { recursive: true });
    writeFileSync(join(parent, "config", "env", "ltqc-local.yaml"), "base_url: https://x\n");
    mkValidActive(
      root,
      "cases:\n  - id: C001\n    title: 验证数据源连通\n    priority: P1\n    precondition: 环境 ltqc-local 已部署\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "real_env_name")).toBe(true);
  });

  it("skips the env-name rule when config/env is absent", () => {
    const root = ws();
    mkValidActive(
      root,
      "cases:\n  - id: C001\n    title: 验证数据源连通\n    priority: P1\n    precondition: 环境 ltqc-local 已部署\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "real_env_name")).toBe(false);
  });
<<<<<<< HEAD

  it("flags metadata paths that do not exist", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\ncase_drafting:\n  xmind_path: cases/missing.xmind\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "metadata_reference_missing")).toBe(true);
  });
=======
>>>>>>> origin/main
});
