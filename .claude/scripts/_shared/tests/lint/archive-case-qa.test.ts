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

\`\`\`
1. 已登录
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
    const root = tmp({ "archive.md": GOOD_ARCHIVE.replace("验证选择", "TC-DM-001 验证选择") });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-title-machine-id")).toBe(true);
  });

  test("flags bracket semantics violation", () => {
    const root = tmp({ "archive.md": GOOD_ARCHIVE.replace("「已绑定」", "【已绑定】") });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-bracket-semantics")).toBe(true);
  });

  test("passes multi-digit priority P10 without bracket false positive", () => {
    const root = tmp({ "archive.md": GOOD_ARCHIVE.replace("【P0】", "【P10】") });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-bracket-semantics")).toBe(false);
  });

  test("flags machine file in feature root", () => {
    const root = tmp({ "archive.md": GOOD_ARCHIVE, "source-snapshot.json": "{}" });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-machine-file-in-root")).toBe(true);
  });

  test("flags deprecated frontmatter field", () => {
    const root = tmp({
      "archive.md": GOOD_ARCHIVE.replace('status: "草稿"', 'status: "草稿"\nproduct: "dataAssets"'),
    });
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-frontmatter-deprecated")).toBe(true);
  });

  test("passes a clean archive", () => {
    const root = tmp({ "archive.md": GOOD_ARCHIVE }, [".process"]);
    const r = lintArchiveCaseQa(join(root, "p", "features"));
    expect(r.passed).toBe(true);
  });
});
