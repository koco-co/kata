import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveToJson } from "@shared/cli/xmind-gen/archive.ts";
import type { IntermediateJson } from "@shared/lib/types.ts";
import ExcelJS from "exceljs";
import { runKataCli, spawnKataCli } from "../cli-runner.ts";

const TEMP_DIR = join(tmpdir(), `kata-cases-convert-${process.pid}`);

const ARCHIVE = `---
suite_name: "格式转换验收"
product_line: "数据资产"
prd_id: 18001
prd_version: "7.1.0"
tags:
  - "数据质量"
  - "格式转换"
case_count: 2
---

## 数据质量

### 任务配置

#### 规则任务管理

##### 【P3】验证多步骤文本无损转换

> 前置条件

\`\`\`
已准备 \${DataSourceA} 数据源
路径为 C:\\cases
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 \\| 规则任务管理】<br>选择任务 | 页面展示任务列表 |
| 2 | 点击「执行」 | 状态更新为成功<br>结果可查询 |

##### 【P4】验证单步骤分支不会被识别为用例节点

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 查看规则任务 | 展示规则任务 |
`;

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe("kata cases convert", () => {
  it("在 MD 与 JSON、CSV、XLSX、XMind 间往返且不丢用例语义", async () => {
    const input = join(TEMP_DIR, "source.md");
    writeFileSync(input, ARCHIVE, "utf8");
    const expected = caseSnapshot(archiveToJson(input, "fallback"));

    for (const format of ["json", "csv", "xlsx", "xmind"] as const) {
      const converted = join(TEMP_DIR, `converted.${format}`);
      const forward = JSON.parse(
        runKataCli(["cases", "convert", "--input", input, "--to", format, "--output", converted]),
      ) as { case_count: number; from: string; to: string };
      expect(forward).toMatchObject({ case_count: 2, from: "md", to: format });
      expect(existsSync(converted)).toBe(true);

      const roundtripMd = join(TEMP_DIR, `roundtrip-${format}.md`);
      const backward = JSON.parse(
        runKataCli([
          "cases",
          "convert",
          "--input",
          converted,
          "--to",
          "md",
          "--output",
          roundtripMd,
        ]),
      ) as { case_count: number };
      expect(backward.case_count).toBe(2);
      const roundtrip = archiveToJson(roundtripMd, "fallback");
      expect(caseSnapshot(roundtrip)).toEqual(expected);
      expect(roundtrip.meta).toMatchObject({
        requirement_id: 18001,
        version: "7.1.0",
        tags: ["数据质量", "格式转换"],
      });
    }
  });

  it("生成的 XLSX 冻结标题行并对所有单元格垂直居中", async () => {
    const input = join(TEMP_DIR, "source.md");
    const output = join(TEMP_DIR, "cases.xlsx");
    writeFileSync(input, ARCHIVE, "utf8");
    runKataCli(["cases", "convert", "-i", input, "-t", "xlsx", "-o", output]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(output);
    const sheet = workbook.getWorksheet("Cases");
    expect(sheet?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet?.getCell("A1").alignment?.vertical).toBe("middle");
    expect(sheet?.getCell("O2").alignment?.vertical).toBe("middle");
  });

  it("兼容中文表头、HTML 列表与三级到五级用例集", () => {
    const input = join(TEMP_DIR, "中文模板.csv");
    const output = join(TEMP_DIR, "中文模板.md");
    writeFileSync(
      input,
      [
        "一级模块用例集名称,二级用例集名称,三级用例集名称,四级用例集名称,五级用例集名称,测试用例概述,优先级,前置条件,测试步骤,期望结果",
        `数据资产,数据质量,规则任务管理,性能优化,SQL合并,验证规则 SQL 合并,2,"<ol><li>已有规则任务</li></ol>","1. 打开任务
2. 执行任务","1. 页面正常
2. 执行成功"`,
      ].join("\n"),
      "utf8",
    );

    const result = JSON.parse(
      runKataCli(["cases", "convert", "-i", input, "-t", "md", "-o", output]),
    ) as { case_count: number };
    const markdown = readFileSync(output, "utf8");
    expect(result.case_count).toBe(1);
    expect(markdown).toContain("## 数据资产");
    expect(markdown).toContain("### 数据质量");
    expect(markdown).toContain("#### 规则任务管理 / 性能优化 / SQL合并");
    expect(markdown).toContain("##### 【P1】验证规则 SQL 合并");
    expect(markdown).toContain("- 已有规则任务");
    expect(markdown).toContain("| 2 | 执行任务 | 执行成功 |");
  });

  it("保留点号编号步骤内的右括号子项", () => {
    const input = join(TEMP_DIR, "嵌套编号.csv");
    const output = join(TEMP_DIR, "嵌套编号.md");
    writeFileSync(
      input,
      [
        "模块,页面,用例标题,测试步骤,预期结果",
        `数据资产,数据质量,验证嵌套编号,"1. 新建规则
2. 执行规则","1. 进入配置页
2. 1) 状态为校验异常
2) 支持查看明细"`,
      ].join("\n"),
      "utf8",
    );

    runKataCli(["cases", "convert", "-i", input, "-t", "md", "-o", output]);

    const markdown = readFileSync(output, "utf8");
    expect(markdown).toContain("| 1 | 新建规则 | 进入配置页 |");
    expect(markdown).toContain("| 2 | 执行规则 | 1) 状态为校验异常<br>2) 支持查看明细 |");
    expect(markdown).not.toContain("| 3 |");
  });

  it("不把跨行的小于号和大于号操作误删为 HTML", () => {
    const input = join(TEMP_DIR, "翻页按钮.csv");
    const output = join(TEMP_DIR, "翻页按钮.md");
    writeFileSync(
      input,
      [
        "模块,页面,用例标题,测试步骤,预期结果",
        `数据资产,数据质量,验证翻页按钮,"1. 点击"<"
2. 点击">"","1. 向前翻页
2. 向后翻页"`,
      ].join("\n"),
      "utf8",
    );

    runKataCli(["cases", "convert", "-i", input, "-t", "md", "-o", output]);

    const markdown = readFileSync(output, "utf8");
    expect(markdown).toContain("| 1 | 点击< | 向前翻页 |");
    expect(markdown).toContain("| 2 | 点击> | 向后翻页 |");
  });

  it("没有用例编号时不合并同标题同前置条件的不同行", () => {
    const input = join(TEMP_DIR, "同标题用例.csv");
    const output = join(TEMP_DIR, "同标题用例.json");
    writeFileSync(
      input,
      [
        "模块,页面,用例标题,前置条件,测试步骤,预期结果",
        "数据资产,数据质量,验证同标题场景,已准备数据,执行场景A,场景A通过",
        "数据资产,数据质量,验证同标题场景,已准备数据,执行场景B,场景B通过",
      ].join("\n"),
      "utf8",
    );

    const result = JSON.parse(
      runKataCli(["cases", "convert", "-i", input, "-t", "json", "-o", output]),
    ) as { case_count: number };
    const converted = JSON.parse(readFileSync(output, "utf8")) as IntermediateJson;

    expect(result.case_count).toBe(2);
    expect(caseSnapshot(converted)).toHaveLength(2);
  });

  it("拒绝静默覆盖与非法目标格式", () => {
    const input = join(TEMP_DIR, "source.md");
    const output = join(TEMP_DIR, "cases.json");
    writeFileSync(input, ARCHIVE, "utf8");
    writeFileSync(output, "existing", "utf8");

    const overwrite = spawnKataCli(["cases", "convert", "-i", input, "-t", "json", "-o", output]);
    expect(overwrite.status).toBe(1);
    expect(overwrite.stderr).toContain("--force");

    const invalid = spawnKataCli(["cases", "convert", "-i", input, "-t", "xml"]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain("Allowed choices are md, xlsx, csv, xmind, json");
  });
});

function caseSnapshot(data: IntermediateJson): unknown[] {
  return data.modules.flatMap((module) =>
    module.pages.flatMap((page) => [
      ...(page.test_cases ?? []).map((testCase) => ({
        path: [module.name, page.name],
        ...testCase,
      })),
      ...(page.sub_groups ?? []).flatMap((subgroup) =>
        subgroup.test_cases.map((testCase) => ({
          path: [module.name, page.name, subgroup.name],
          ...testCase,
        })),
      ),
    ]),
  );
}
