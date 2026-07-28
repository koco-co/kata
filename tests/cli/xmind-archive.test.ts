import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveToJson, parseArchiveBody } from "../../cli/lib/xmind-archive.ts";

const ARCHIVE = `## 模块A
### 页面B
<!-- case_id: C0001 -->
##### 【P0】用例一
> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 操作一 | 预期一 |
`;

describe("parseArchiveBody", () => {
  it("attaches a case_id anchor to the next case", () => {
    const modules = parseArchiveBody(ARCHIVE);
    const c = modules[0].pages[0].test_cases?.[0];
    expect(c?.case_id).toBe("C0001");
    expect(c?.priority).toBe("P0");
    expect(c?.steps).toEqual([{ step: "操作一", expected: "预期一" }]);
  });

  it("drops a stale anchor when a non-case heading intervenes", () => {
    const modules = parseArchiveBody(`<!-- case_id: C999 -->
## 模块B
##### 【P1】用例二
> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | a | e |
`);
    expect(modules[0].pages[0].test_cases?.[0]?.case_id).toBeUndefined();
  });

  it("clears the anchor on page and subgroup headings too", () => {
    const body = `<!-- case_id: C999 -->
### 页面C
##### 【P1】用例三
> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | a | e |
`;
    const modules = parseArchiveBody(body);
    expect(modules[0].pages[0].test_cases?.[0]?.case_id).toBeUndefined();
  });
});

describe("archiveToJson", () => {
  it("roundtrips quoted frontmatter scalars and inline objects", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-xa-"));
    const md = join(dir, "需求.md");
    writeFileSync(
      md,
      `---
suite_name: "我的需求, v2"
prd_id: 12345
tags:
- "质量,核心"
---
${ARCHIVE}`,
    );
    const json = archiveToJson(md, "proj");
    expect(json.meta.requirement_name).toBe("我的需求, v2");
    expect(json.meta.requirement_id).toBe(12345);
    expect(json.meta.tags).toEqual(["质量,核心"]);
    expect(json.modules[0].pages[0].test_cases?.[0]?.case_id).toBe("C0001");
  });
});
