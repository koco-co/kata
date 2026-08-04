import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { declaredRequirementIds } from "../../cli/lib/cases/requirement-locate.ts";
import { computePrdDigest } from "../../cli/lib/prd.ts";

const YAML = `
meta: { title: 需求名, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【数据质量】-【规则库配置】进入页面，展示规则列表
    priority: P0
    precondition: 无
    steps:
      - action: 进入【数据质量 → 规则库配置】页面
        expected: 进入成功
`;

function feature(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-cb-"));
  const featureDir = join(root, "workspace", "dataAssets", "features", "v1.0", "【模块】需求名");
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(featureDir, "cases", "需求名.yaml"), YAML);
  return featureDir;
}

describe("kata cases build", () => {
  it("defaults to xmind only when meta.exports is absent", async () => {
    const d = feature();
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const xmindPath = join(d, "cases", "exports", "需求名.xmind");
    expect(existsSync(xmindPath)).toBe(true);
    // xmind 是 zip:必须可解压且含 content.json
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(readFileSync(xmindPath));
    expect(zip.file("content.json")).not.toBeNull();
    expect(existsSync(join(d, "cases", "exports", "需求名.md"))).toBe(false);
  });
  it("fails on zero cases", () => {
    const d = feature();
    writeFileSync(
      join(d, "cases", "需求名.yaml"),
      'meta: { title: t, case_module_id: "" }\ncases: []\n',
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
  });
  it("blocks derived artifacts when authored-case content lint fails", () => {
    const d = feature();
    writeFileSync(
      join(d, "cases", "需求名.yaml"),
      `meta: { title: 需求名, case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【数据质量】-【规则库配置】点击新增，打开新增弹窗
    priority: P0
    precondition: 准备测试数据
    steps:
      - action: 点击新增按钮
        expected: 打开新增弹窗
`,
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("case_forbidden_term");
    expect(r.stderr).toContain("case_first_step_navigation");
    expect(existsSync(join(d, "cases", "exports", "需求名.xmind"))).toBe(false);
  });
  it("blocks stale cases when test-points no longer matches the PRD digest chain", () => {
    const d = feature();
    mkdirSync(join(d, "prd"), { recursive: true });
    const prd = `---
source: lanhu
source_url: "https://lanhuapp.com/"
requirement_id: "1"
evidence_digest: "sha256:evidence"
---
# 需求
`;
    writeFileSync(join(d, "prd", "prd.md"), prd);
    const actualPrdDigest = computePrdDigest(prd);
    writeFileSync(
      join(d, "cases", "test-points.md"),
      `---
prd_digest: "${actualPrdDigest}"
---
# 测试点

| ID | 测试点 | 类型 | 优先级 | PRD 依据 |
| --- | --- | --- | --- | --- |
| TP-001 | 验证需求 | 正常 | P0 | FR-001, AC-001 |
`,
    );
    writeFileSync(
      join(d, "cases", "需求名.yaml"),
      `meta:
  title: 需求名
  case_module_id: ""
  test_points_digest: "sha256:stale"
cases:
  - case_id: C0001
    title: 用例一
    priority: P0
    steps: [{ action: a, expected: e }]
`,
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("test_points_digest");
  });

  it("rejects a symlinked cases directory before rendering", () => {
    const d = feature();
    const outside = mkdtempSync(join(tmpdir(), "kata-cb-outside-"));
    rmSync(join(d, "cases"), { recursive: true, force: true });
    symlinkSync(outside, join(d, "cases"));
    try {
      const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
        encoding: "utf8",
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("符号链接");
      expect(existsSync(join(outside, "exports"))).toBe(false);
    } finally {
      rmSync(join(d, "cases"), { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

const BUILD_YAML = (requirementId: string) => `meta:
  title: 需求名
  case_module_id: ""
  requirement_id: "${requirementId}"
cases:
  - case_id: C0001
    title: 验证【数据质量】-【规则库配置】进入页面，展示规则列表
    priority: P0
    precondition: 无
    steps:
      - action: 进入【数据质量 → 规则库配置】页面
        expected: 进入成功
`;

function workspaceRoot(): string {
  return mkdtempSync(join(tmpdir(), "kata-cb-ws-"));
}

function writeFeature(
  root: string,
  project: string,
  requirementId: string,
  dirName: string,
): string {
  const featureDir = join(root, project, "features", "v1.0", dirName);
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(featureDir, "cases", "需求名.yaml"), BUILD_YAML(requirementId));
  return featureDir;
}

function runBuild(args: string[], workspace?: string) {
  return spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", ...args], {
    encoding: "utf8",
    env: workspace ? { ...process.env, KATA_WORKSPACE_ROOT: workspace } : process.env,
  });
}

describe("kata cases build by requirement id", () => {
  it("builds the feature whose yaml declares the requirement id", () => {
    const root = workspaceRoot();
    const featureDir = writeFeature(root, "dataAssets", "16019", "【模块】需求名");
    try {
      const r = runBuild(["16019"], root);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("created");
      expect(existsSync(join(featureDir, "cases", "exports", "需求名.xmind"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds every matching feature across projects", () => {
    const root = workspaceRoot();
    const a = writeFeature(root, "dataAssets", "16019", "【模块】需求甲");
    const b = writeFeature(root, "batchWorks", "16019", "【模块】需求乙");
    try {
      const r = runBuild(["16019"], root);
      expect(r.status).toBe(0);
      expect(existsSync(join(a, "cases", "exports", "需求名.xmind"))).toBe(true);
      expect(existsSync(join(b, "cases", "exports", "需求名.xmind"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("preflights every target before any write: one broken target blocks all artifacts", () => {
    const root = workspaceRoot();
    const valid = writeFeature(root, "dataAssets", "16019", "【模块】需求甲");
    const broken = writeFeature(root, "batchWorks", "16019", "【模块】需求乙");
    // 第二个目标在预检阶段失败：cases 为空触发 validateCases 报错
    writeFileSync(join(broken, "cases", "需求名.yaml"), `meta:
  title: 需求名
  case_module_id: ""
  requirement_id: "16019"
cases: []
`);
    try {
      const r = runBuild(["16019"], root);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("用例数为 0");
      // 合法的第一个目标也不得写入任何产物
      expect(existsSync(join(valid, "cases", "exports", "需求名.xmind"))).toBe(false);
      expect(existsSync(join(valid, "cases", "exports"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails when no feature declares the requirement id", () => {
    const root = workspaceRoot();
    writeFeature(root, "dataAssets", "16019", "【模块】需求名");
    try {
      const r = runBuild(["99999"], root);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("未找到 requirement_id=99999");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects combining --feature with a requirement id", () => {
    const r = runBuild(["16019", "--feature", "x"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("只能指定一个");
  });

  it("requires either --feature or a requirement id", () => {
    const r = runBuild([]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("必须指定 <requirementId> 或 --feature");
  });

  it("rejects a non-digit requirement id", () => {
    const r = runBuild(["abc"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("需求 id 必须是数字");
  });
});

describe("declaredRequirementIds", () => {
  it("extracts meta, requirements and per-case requirement ids", () => {
    expect(
      declaredRequirementIds(`meta: { requirement_id: "16019", case_module_id: "" }
requirements:
  - { requirement_id: "2001", title: r1, source: s }
cases:
  - case_id: C0001
    title: t
    priority: P0
    requirement_id: "2002"
    steps: [{ action: a, expected: e }]
`),
    ).toEqual(expect.arrayContaining(["16019", "2001", "2002"]));
  });

  it("accepts unquoted numeric ids and ignores non-digit ids", () => {
    expect(declaredRequirementIds("meta: { requirement_id: 16019 }")).toEqual(["16019"]);
    expect(declaredRequirementIds("meta: { requirement_id: abc }")).toEqual([]);
  });

  it("ignores malformed or empty yaml", () => {
    expect(declaredRequirementIds("meta: [unclosed")).toEqual([]);
    expect(declaredRequirementIds("")).toEqual([]);
  });
});
