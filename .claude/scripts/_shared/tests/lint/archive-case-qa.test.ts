import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintArchiveCaseQa } from "@shared/lint/archive-case-qa.ts";

function feature(files: Record<string, string>, dirs: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), "aos-"));
  const fdir = join(root, "p", "features", "2026-05-x");
  mkdirSync(fdir, { recursive: true });
  for (const d of dirs) mkdirSync(join(fdir, d), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(fdir, name, ".."), { recursive: true });
    writeFileSync(join(fdir, name), body);
  }
  return root;
}

const GOOD_ARCHIVE = `---
suite_name: "X"
status: "草稿"
case_count: 1
origin: "case-draft"
---

## 元数据

### 数据地图

##### 【P0】验证选择「已绑定」仅返回已绑定的数据表

> 前置条件

\`\`\`SQL
-- 1. 已登录
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 选择「已绑定」 | 列表仅展示已绑定数据表 |
`;

describe("lintArchiveCaseQa", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const r of roots.splice(0)) {
      rmSync(r, { recursive: true, force: true });
    }
  });

  function tmp(files: Record<string, string>, dirs: string[] = []): string {
    const root = feature(files, dirs);
    roots.push(root);
    return root;
  }

  test("flags TC-ID in case title", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("验证选择", "TC-DM-001 验证选择"),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-title-machine-id")).toBe(true);
  });

  test("flags bracket semantics violation", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("「已绑定」", "【已绑定】"),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-bracket-semantics")).toBe(true);
  });

  test("passes multi-digit priority P10 without bracket false positive", () => {
    const root = tmp({ "cases/archive.md": GOOD_ARCHIVE.replace("【P0】", "【P10】") });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-bracket-semantics")).toBe(false);
  });

  test("flags machine file in feature root", () => {
    const root = tmp({ "cases/archive.md": GOOD_ARCHIVE, "source-snapshot.json": "{}" });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-machine-file-in-root")).toBe(true);
  });

  test("flags deprecated frontmatter field", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace(
        'status: "草稿"',
        'status: "草稿"\nproduct: "dataAssets"',
      ),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-frontmatter-deprecated")).toBe(true);
  });

  test("passes a clean archive", () => {
    const root = tmp({ "cases/archive.md": GOOD_ARCHIVE }, [".process"]);
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.passed).toBe(true);
  });

  test("flags case_count mismatch with actual ##### case headings", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("case_count: 1", "case_count: 2"),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-case-count-mismatch")).toBe(true);
  });

  test("does not flag description or product_line frontmatter (consumed fields)", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace(
        'status: "草稿"',
        'status: "草稿"\ndescription: "X 用例归档"\nproduct_line: "dataAssets"',
      ),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(
      r.violations.some(
        (v) =>
          v.rule === "archive-frontmatter-deprecated" &&
          (v.matched === "description" || v.matched === "product_line"),
      ),
    ).toBe(false);
  });

  test("flags system-state placeholder in preconditions", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace(
        "-- 1. 已登录",
        "-- 1. 数据资产平台与数据质量各服务已正常部署运行。",
      ),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-precondition-placeholder")).toBe(true);
  });

  test("does not flag login-only precondition as system-state placeholder", () => {
    const root = tmp({ "cases/archive.md": GOOD_ARCHIVE });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-precondition-placeholder")).toBe(false);
  });

  test("flags a precondition code block without the SQL language marker", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("```SQL", "```"),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-precondition-sql-fence")).toBe(true);
  });

  test("flags non-SQL precondition prose that is not a SQL comment", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("-- 1. 已登录", "1. 已登录"),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-precondition-prose-not-comment")).toBe(
      true,
    );
  });

  test("allows SQL statements and commented descriptions in preconditions", () => {
    const root = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace(
        "-- 1. 已登录",
        "-- 1. HiveSQL执行文件如下:\nCREATE TABLE test_table (\n  id INT\n);\nINSERT INTO test_table VALUES (1);",
      ),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-precondition-prose-not-comment")).toBe(
      false,
    );
  });

  test("flags weak, empty, and orphan expected results", () => {
    const weak = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("列表仅展示已绑定数据表", "进入成功"),
    });
    expect(
      lintArchiveCaseQa(join(weak, "p", "features")).violations.some(
        (v) => v.rule === "archive-weak-expected",
      ),
    ).toBe(true);

    const empty = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("列表仅展示已绑定数据表", ""),
    });
    expect(
      lintArchiveCaseQa(join(empty, "p", "features")).violations.some(
        (v) => v.rule === "archive-empty-expected",
      ),
    ).toBe(true);

    const orphan = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("列表仅展示已绑定数据表", "2."),
    });
    expect(
      lintArchiveCaseQa(join(orphan, "p", "features")).violations.some(
        (v) => v.rule === "archive-orphan-expected-number",
      ),
    ).toBe(true);
  });

  test("flags legacy data placeholders and ambiguous draft steps", () => {
    const placeholder = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("| 1 | 选择「已绑定」 |", "| 1 | 选择已有数据源 |"),
    });
    expect(
      lintArchiveCaseQa(join(placeholder, "p", "features")).violations.some(
        (v) => v.rule === "archive-legacy-data-placeholder",
      ),
    ).toBe(true);

    const draft = tmp({
      "cases/archive.md": GOOD_ARCHIVE.replace("| 1 | 选择「已绑定」 |", "| 1 | UI Check |"),
    });
    expect(
      lintArchiveCaseQa(join(draft, "p", "features")).violations.some(
        (v) => v.rule === "archive-ambiguous-step",
      ),
    ).toBe(true);
  });
});
