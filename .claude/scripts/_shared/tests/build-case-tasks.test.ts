import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCaseTaskList,
  classifyMutation,
  isSerialCase,
  parseArchiveCases,
} from "@skills/playwright-automation/scripts/build-case-tasks.ts";
import { stringify as yamlStringify } from "yaml";
import { spawnKataCli } from "./cli-runner.ts";

const ARCHIVE_SNIPPET = `---
suite_name: "示例集合"
case_count: 3
---

### 资产盘点

##### 【P1】验证已接入数据源统计数据正确

> 前置条件

\`\`\`
无
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入资产-【资产盘点】页面 | 进入成功 |
| 2 | 查看"已接入数据源" | 显示统计卡片 |

##### 【P2】新增一条质量规则并删除

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 点击新增规则，填写表单保存 | 创建成功 |
| 2 | 在列表中删除该规则 | 删除成功 |

##### 【P0】泸州老窖环境脏数据清理

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入泸州老窖环境清理脏数据 | 清理成功 |
`;

describe("classifyMutation", () => {
  it("纯查看步骤判为只读", () => {
    expect(classifyMutation("进入页面\n查看统计数据")).toBe(false);
  });
  it("含新增/保存/删除判为写", () => {
    expect(classifyMutation("点击新增规则，填写表单保存")).toBe(true);
    expect(classifyMutation("在列表中删除该规则")).toBe(true);
  });
});

describe("isSerialCase", () => {
  it("同时含创建与删除判为串行", () => {
    expect(isSerialCase("点击新增规则保存\n删除该规则")).toBe(true);
  });
  it("只读用例非串行", () => {
    expect(isSerialCase("进入页面\n查看数据")).toBe(false);
  });
  it("只创建不删除：写但非串行", () => {
    const steps = "点击新增规则，填写表单保存";
    expect(classifyMutation(steps)).toBe(true);
    expect(isSerialCase(steps)).toBe(false);
  });
});

describe("parseArchiveCases", () => {
  const cases = parseArchiveCases(ARCHIVE_SNIPPET);

  it("枚举出全部 3 条用例，标题=heading 文本", () => {
    expect(cases.map((c) => c.title)).toEqual([
      "验证已接入数据源统计数据正确",
      "新增一条质量规则并删除",
      "泸州老窖环境脏数据清理",
    ]);
  });
  it("id 为稳定全局序号、保留 priority", () => {
    expect(cases[0].id).toBe("C001");
    expect(cases[0].priority).toBe("P1");
    expect(cases[1].id).toBe("C002");
  });
  it("读写分类与串行标记正确", () => {
    expect(cases[0].mutates_data).toBe(false);
    expect(cases[1].mutates_data).toBe(true);
    expect(cases[1].serial).toBe(true);
  });
  it("命中租户/环境关键词的用例标 excluded", () => {
    expect(cases[2].excluded).toEqual({
      reason_category: "tenant_mismatch",
      reason: "命中跨环境/租户关键词：泸州老窖",
    });
  });
  it("heading 无优先级前缀时 priority 回退为 P?", () => {
    const cases = parseArchiveCases(
      `##### 无优先级的用例标题\n\n> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入页面 | 成功 |\n`,
    );
    expect(cases[0].priority).toBe("P?");
    expect(cases[0].title).toBe("无优先级的用例标题");
  });
});

const TMP = join(tmpdir(), `kata-case-tasks-${process.pid}`);

beforeAll(() => {
  mkdirSync(TMP, { recursive: true });
});
afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

function makeFeature(name: string, manifest: object, archive?: string): string {
  const dir = join(TMP, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  if (archive) writeFileSync(join(dir, "archive.md"), archive);
  return dir;
}

// 写 metadata.yaml@2 + 可选 archive 文件（落在 cases/ 子目录下）
function makeFeatureV2(
  name: string,
  meta: object,
  archiveContent?: string,
  archiveSubPath = "cases/archive.md",
): string {
  const dir = join(TMP, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "metadata.yaml"), yamlStringify(meta));
  if (archiveContent) {
    const archivePath = join(dir, archiveSubPath);
    mkdirSync(join(dir, archiveSubPath.split("/").slice(0, -1).join("/")), { recursive: true });
    writeFileSync(archivePath, archiveContent);
  }
  return dir;
}

describe("buildCaseTaskList", () => {
  it("intents 为空时退回解析 archive.md", () => {
    const dir = makeFeature(
      "f-archive",
      {
        feature_id: "demo-archive",
        automation: { intents: [] },
        files: { archive: "archive.md" },
      },
      ARCHIVE_SNIPPET,
    );
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("archive_md");
    expect(list.feature_id).toBe("demo-archive");
    expect(list.case_count).toBe(3);
    expect(list.cases[1].mutates_data).toBe(true);
  });

  it("intents 有 ready 项时优先用 intents", () => {
    const dir = makeFeature("f-intents", {
      feature_id: "demo-intents",
      automation: {
        intents: [
          { id: "I1", title: "新增规则并保存", automation_status: "ready" },
          { id: "I2", title: "查看规则列表", automation_status: "ready" },
        ],
      },
      files: { archive: "archive.md" },
    });
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("manifest_intents");
    expect(list.case_count).toBe(2);
    expect(list.cases[0].title).toBe("新增规则并保存");
    expect(list.cases[0].mutates_data).toBe(true);
    expect(list.cases[1].mutates_data).toBe(false);
  });

  it("混合状态 intents 只取 ready 项", () => {
    const dir = makeFeature("f-mixed", {
      feature_id: "demo-mixed",
      automation: {
        intents: [
          { id: "I1", title: "新增规则并保存", automation_status: "ready" },
          { id: "I2", title: "查看规则列表", automation_status: "ready" },
          { id: "I3", title: "草稿用例不应出现", automation_status: "draft" },
        ],
      },
      files: { archive: "archive.md" },
    });
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("manifest_intents");
    expect(list.case_count).toBe(2);
    expect(list.cases.map((c) => c.title)).not.toContain("草稿用例不应出现");
  });

  it("manifest 缺失时抛错", () => {
    expect(() => buildCaseTaskList(join(TMP, "does-not-exist"))).toThrow();
  });

  it("intents 为空且 manifest 无 archive 路径时抛错", () => {
    const dir = makeFeature("f-no-archive-path", {
      feature_id: "demo-no-archive-path",
      automation: { intents: [] },
    });
    expect(() => buildCaseTaskList(dir)).toThrow();
  });

  it("archive 路径在 manifest 指定但文件不存在时抛错", () => {
    const dir = makeFeature("f-archive-missing", {
      feature_id: "demo-archive-missing",
      automation: { intents: [] },
      files: { archive: "missing.md" },
    });
    expect(() => buildCaseTaskList(dir)).toThrow();
  });

  it("manifest 不存在时抛清晰错误（@1 兜底路径）", () => {
    const dir = makeFeatureV2("f-no-meta-no-manifest", {
      schema: "FeatureMetadata@1",
      id: "no-manifest",
    });
    expect(() => buildCaseTaskList(dir)).toThrow(/no metadata\.yaml or manifest\.json/);
  });
});

// ─── @2 metadata.yaml 分流测试 ───

describe("buildCaseTaskList @2 (metadata.yaml)", () => {
  it("@2 有 ready intents → 优先用 intents 分支", () => {
    const dir = makeFeatureV2("v2-intents", {
      schema: "FeatureMetadata@2",
      id: "v2-demo",
      feature_id: "v2-demo-feature",
      automation: {
        intents: [
          { id: "I1", title: "新增规则并保存", automation_status: "ready" },
          { id: "I2", title: "查看规则列表", automation_status: "ready" },
        ],
      },
      files: { archive: "cases/archive.md" },
    });
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("manifest_intents");
    expect(list.feature_id).toBe("v2-demo-feature");
    expect(list.case_count).toBe(2);
    expect(list.cases[0].title).toBe("新增规则并保存");
    expect(list.cases[0].mutates_data).toBe(true);
  });

  it("@2 intents 为空 → 退回解析 files.archive 指向的 cases/archive.md", () => {
    const dir = makeFeatureV2(
      "v2-archive",
      {
        schema: "FeatureMetadata@2",
        id: "v2-archive-demo",
        feature_id: "v2-archive-feature",
        automation: { intents: [] },
        files: { archive: "cases/archive.md" },
      },
      ARCHIVE_SNIPPET,
    );
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("archive_md");
    expect(list.feature_id).toBe("v2-archive-feature");
    expect(list.case_count).toBe(3);
    expect(list.cases[1].mutates_data).toBe(true);
  });

  it("@2 feature_id 缺失时回退到 id", () => {
    const dir = makeFeatureV2(
      "v2-fallback-id",
      {
        schema: "FeatureMetadata@2",
        id: "fallback-id",
        automation: { intents: [] },
        files: { archive: "cases/archive.md" },
      },
      ARCHIVE_SNIPPET,
    );
    const list = buildCaseTaskList(dir);
    expect(list.feature_id).toBe("fallback-id");
  });

  it("@2 混合 intents 只取 ready 项", () => {
    const dir = makeFeatureV2("v2-mixed", {
      schema: "FeatureMetadata@2",
      id: "v2-mixed",
      automation: {
        intents: [
          { id: "I1", title: "新增规则并保存", automation_status: "ready" },
          { id: "I2", title: "草稿用例不应出现", automation_status: "draft" },
        ],
      },
      files: { archive: "cases/archive.md" },
    });
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("manifest_intents");
    expect(list.case_count).toBe(1);
    expect(list.cases.map((c) => c.title)).not.toContain("草稿用例不应出现");
  });

  it("@2 无 intents 且无 archive 路径时抛错", () => {
    const dir = makeFeatureV2("v2-no-archive", {
      schema: "FeatureMetadata@2",
      id: "v2-no-archive",
      automation: { intents: [] },
      files: {},
    });
    expect(() => buildCaseTaskList(dir)).toThrow(/no automation intents and no archive path/);
  });

  it("@2 case_drafting.archive_path 作为备选 archive 路径", () => {
    const dir = makeFeatureV2(
      "v2-case-drafting-archive",
      {
        schema: "FeatureMetadata@2",
        id: "v2-case-drafting",
        feature_id: "v2-case-drafting-feature",
        automation: { intents: [] },
        case_drafting: { archive_path: "cases/archive.md" },
        files: {},
      },
      ARCHIVE_SNIPPET,
    );
    const list = buildCaseTaskList(dir);
    expect(list.source).toBe("archive_md");
    expect(list.feature_id).toBe("v2-case-drafting-feature");
    expect(list.case_count).toBe(3);
  });
});

// ─── e2e：通过真实 kata CLI 执行 ───

describe("kata case-tasks build (e2e)", () => {
  it("对真实 feature 目录输出合法 CaseTaskList JSON", () => {
    const dir = makeFeature(
      "f-cli",
      { feature_id: "demo-cli", automation: { intents: [] }, files: { archive: "archive.md" } },
      ARCHIVE_SNIPPET,
    );
    const { status, stdout } = spawnKataCli(["case-tasks", "build", "--feature", dir]);
    expect(status).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.source).toBe("archive_md");
    expect(parsed.case_count).toBe(3);
  });

  it("目录无 manifest 时非零退出", () => {
    const { status } = spawnKataCli(["case-tasks", "build", "--feature", join(TMP, "missing")]);
    expect(status).not.toBe(0);
  });
});
