import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【资产盘点】-【列表】展示数据，核对结果
    priority: P1
    precondition: 无
    steps:
      - action: 进入【资产盘点】页面
        expected: 进入成功
      - action: 查看盘点结果列表
        expected: 列表展示 1 条记录
      - action: 确认盘点状态
        expected: 状态显示为「进行中」
`,
    );
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

  function authoredCases(p0Count: number, total = 8): string {
    const cases = Array.from({ length: total }, (_, index) => {
      const priority = index < p0Count ? "P0" : "P1";
      return `  - case_id: C${String(index + 1).padStart(4, "0")}\n    title: 验证场景${index + 1}在执行时展示确定结果\n    priority: ${priority}\n    precondition: 无\n    steps:\n      - action: 进入【资产盘点】页面\n        expected: 进入成功`;
    }).join("\n");
    return `meta: { title: 需求, case_module_id: "" }\ncases:\n${cases}\n`;
  }

  it("enforces the lower bound of authored active-case P0 ratio", () => {
    const root = ws();
    mkValidActive(root, authoredCases(1));
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).toContain("p0_ratio");
  });

  it("enforces the upper bound of authored active-case P0 ratio at 30%", () => {
    const root = ws();
    mkValidActive(root, authoredCases(3));
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    const p0 = violations.find((violation) => violation.rule === "p0_ratio");
    expect(p0?.message).toContain("[20%,30%]");
  });

  it("accepts an authored active-case P0 ratio inside [20%,30%]", () => {
    const root = ws();
    mkValidActive(root, authoredCases(2));
    expect(
      runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.some(
        (violation) => violation.rule === "p0_ratio",
      ),
    ).toBe(false);
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
    mkdirSync(join(parent, "config", "private", "environments"), { recursive: true });
    writeFileSync(
      join(parent, "config", "private", "environments", "ltqc-local.yaml"),
      "base_url: https://x\n",
    );
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

  it("allows real environment names only in meta.automation_env", () => {
    const parent = mkdtempSync(join(tmpdir(), "kata-fl-env-meta-"));
    const root = join(parent, "workspace");
    mkdirSync(join(root, "dataAssets", "features"), { recursive: true });
    mkdirSync(join(parent, "config", "private", "environments"), { recursive: true });
    writeFileSync(
      join(parent, "config", "private", "environments", "ltqc-local.yaml"),
      "base_url: https://x\n",
    );
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "", automation_env: ltqc-local }
cases:
  - case_id: C0001
    title: 验证【数据质量】页面进入
    priority: P1
    precondition: 无
    steps:
      - action: 进入页面
        expected: 展示正常
`,
    );
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    expect(violations.some((violation) => violation.rule === "real_env_name")).toBe(false);
  });

  it("flags a declared historical import that is absent from cases/imports", () => {
    const root = ws();
    mkValidActive(
      root,
      "meta:\n  imports: [历史用例.csv]\ncases:\n  - id: C0001\n    title: 验证字段\n    priority: P1\n",
    );
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    expect(violations.some((violation) => violation.rule === "case_import_missing")).toBe(true);
  });

  it("accepts a declared historical import that exists in cases/imports", () => {
    const root = ws();
    const feature = mkValidActive(
      root,
      "meta:\n  imports: [历史用例.csv]\ncases:\n  - id: C0001\n    title: 验证字段\n    priority: P1\n",
    );
    const importsDir = join(root, "dataAssets", "features", feature, "cases", "imports");
    mkdirSync(importsDir);
    writeFileSync(join(importsDir, "历史用例.csv"), "用例标题\n验证字段\n");
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    expect(violations.some((violation) => violation.rule === "case_import_missing")).toBe(false);
  });

  it("uses KATA_WORKSPACE_ROOT when the CLI lints cases", () => {
    const workspaceRoot = ws();
    mkValidActive(
      workspaceRoot,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 原始历史标题
    priority: P1
    precondition: 无
    steps:
      - action: 进入【资产盘点】页面
        expected: 展示正常
`,
    );
    const result = spawnSync(
      "bun",
      ["cli/bin/kata.ts", "cases", "lint", "--project", "dataAssets", "--exit-code"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, KATA_WORKSPACE_ROOT: workspaceRoot },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("case_forbidden_term");
    expect(result.stdout).toContain("修复：");
  });

  it("enforces global authored-case content rules without exposing a case location", () => {
    const root = ws();
    mkValidActive(
      root,
      `meta:
  title: 需求
  requirement_id: "16178"
  case_module_id: ""
cases:
  - case_id: C0001
    requirement_id: "16178"
    title: 验证新增规则
    priority: P0
    precondition: 准备规则
    steps:
      - action: 点击新增按钮
        expected: 打开新增弹窗
`,
    );
    const violations = runFeaturesLint({
      project: "dataAssets",
      workspaceRoot: root,
      repoRoot: resolve(import.meta.dir, "../.."),
    }).violations;
    expect(violations.map((item) => item.rule)).toContain("case_forbidden_term");
    expect(violations.map((item) => item.rule)).toContain("case_first_step_navigation");
    const message = violations.map((item) => item.message).join("\n");
    expect(message).toContain("实际：点击新增按钮");
    expect(message).not.toContain("C0001");
  });

  it("flags semicolon-packed preconditions in the authored YAML source", () => {
    const root = ws();
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【编码配置】-【保存】展示保存结果
    priority: P1
    precondition: 1) 编码配置包含 L1 前缀 BD；L2/L3/L4/L5 使用独立前缀；目录 L1_01 已存在
    steps:
      - action: 进入【数据资产】页面
        expected: 进入成功
`,
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (item) => item.rule,
    );
    expect(rules).toContain("case_precondition_semicolon");

    const canonical = ws();
    mkValidActive(
      canonical,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【编码配置】-【保存】展示保存结果
    priority: P1
    precondition: |-
      1) 编码配置包含 L1 前缀 BD
      2) L2/L3/L4/L5 使用独立前缀
      3) 目录 L1_01 已存在
    steps:
      - action: 进入【数据资产】页面
        expected: 进入成功
`,
    );
    const canonicalRules = runFeaturesLint({
      project: "dataAssets",
      workspaceRoot: canonical,
    }).violations.map((item) => item.rule);
    expect(canonicalRules).not.toContain("case_precondition_semicolon");
  });

  it("accepts stable case ids after canonical YAML order changes", () => {
    const root = ws();
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0002
    title: 验证第二个位置写入 C0002
    priority: P1
    steps:
      - action: 进入【资产盘点】页面
        expected: 进入成功
  - case_id: C0001
    title: 验证第一个位置写入 C0001
    priority: P1
    steps:
      - action: 进入【资产盘点】页面
        expected: 进入成功
`,
    );
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    expect(
      violations.filter(
        (violation) => violation.rule === "case_validate" && violation.case_id !== undefined,
      ),
    ).toEqual([]);
  });

  it("flags concrete schema names instead of SchemaX placeholders", () => {
    const root = ws();
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【表管理】-【查询】展示查询结果
    priority: P1
    precondition: 1) 数据库 test_schema_13180_c0001 中存在已同步表 test_table_13180_c0001
    steps:
      - action: 进入【数据地图】页面
        expected: 进入成功
`,
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (item) => item.rule,
    );
    expect(rules).toContain("case_sql_schema_placeholder");

    const canonical = ws();
    mkValidActive(
      canonical,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【表管理】-【查询】展示查询结果
    priority: P1
    precondition: |-
      1) 已同步表 test_table_13180_c0001
    steps:
      - action: 进入【数据地图】页面
        expected: 进入成功
`,
    );
    const canonicalRules = runFeaturesLint({
      project: "dataAssets",
      workspaceRoot: canonical,
    }).violations.map((item) => item.rule);
    expect(canonicalRules).not.toContain("case_sql_schema_placeholder");
  });

  it("flags tags that reference a real navigation page the case never enters", () => {
    const root = ws();
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【数据地图】-【字段导入】导入字段文件，展示字段导入结果
    priority: P1
    precondition: 无
    tags: [元数据, 数据地图]
    steps:
      - action: 进入【元数据 → 数据目录 → 目录管理】页面
        expected: 进入成功
  - case_id: C0002
    title: 验证【数据地图】-【表详情】查看表详情，展示字段列表
    priority: P1
    precondition: 无
    tags: [元数据, 数据地图]
    steps:
      - action: 进入【元数据 → 数据地图】页面
        expected: 进入成功
`,
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).toContain("case_tag_nav_consistency");
  });

  it("accepts tags matching the entered navigation page", () => {
    const root = ws();
    mkValidActive(
      root,
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【数据地图】-【表详情】查看表详情，展示字段列表
    priority: P1
    precondition: 无
    tags: [元数据, 数据地图]
    steps:
      - action: 进入【元数据 → 数据地图】页面
        expected: 进入成功
`,
    );
    const rules = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations.map(
      (v) => v.rule,
    );
    expect(rules).not.toContain("case_tag_nav_consistency");
  });

  it("flags a cases YAML that is not parseable as YAML", () => {
    const root = ws();
    mkValidActive(
      root,
      'cases:\n  -     tags: ["数据开发"]\ncase_id: C0001\n    title: 验证字段\n',
    );
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    const parseViolations = violations.filter((v) => v.rule === "case_yaml_parse");
    expect(parseViolations.length).toBe(1);
    expect(parseViolations[0].message).toContain("不是合法 YAML");
    expect(parseViolations[0].message).toContain("修复源文件");
  });

  it("reports internal parse-lint failures instead of swallowing them", () => {
    const root = ws();
    // 顶层是数组而不是对象: parse() 成功但 parseCasesYaml 会抛 CasesParseError
    mkValidActive(root, "- broken\n");
    const violations = runFeaturesLint({ project: "dataAssets", workspaceRoot: root }).violations;
    const internal = violations.filter((v) => v.rule === "case_parse_internal");
    expect(internal.length).toBe(1);
    expect(internal[0].message).toContain("解析内部错误");
  });

  it("fails --exit-code when a cases YAML is not parseable", () => {
    const workspaceRoot = ws();
    mkValidActive(
      workspaceRoot,
      'cases:\n  -     tags: ["数据开发"]\ncase_id: C0001\n    title: 验证\n',
    );
    const result = spawnSync(
      "bun",
      ["cli/bin/kata.ts", "cases", "lint", "--project", "dataAssets", "--exit-code"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, KATA_WORKSPACE_ROOT: workspaceRoot },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("case_yaml_parse");
    expect(result.stdout).toContain("不是合法 YAML");
  });

  it("lints every workspace project through --all-projects", () => {
    const workspaceRoot = ws();
    mkdirSync(join(workspaceRoot, "batchWorks", "features", "v1.0", "【模块】需求", "cases"), {
      recursive: true,
    });
    writeFileSync(
      join(workspaceRoot, "batchWorks", "features", "v1.0", "【模块】需求", "cases", "需求.yaml"),
      `meta: { title: 需求, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证需求
    priority: P0
    precondition: 无
    steps:
      - action: 点击新增
        expected: 打开新增弹窗
`,
    );
    const result = spawnSync(
      "bun",
      ["cli/bin/kata.ts", "cases", "lint", "--all-projects", "--exit-code"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, KATA_WORKSPACE_ROOT: workspaceRoot },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("batchWorks");
    expect(result.stdout).toContain("case_first_step_navigation");
  });
});
