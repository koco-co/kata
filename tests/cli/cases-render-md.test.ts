import { describe, expect, it } from "bun:test";
import { renderMarkdown } from "../../cli/lib/cases/render-md.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";
import { parseArchiveBody } from "../../cli/lib/xmind-archive.ts";

function file(cases: CasesFile["cases"]): CasesFile {
  return { meta: { title: "需求名", version: "v1", feature_id: "g/f" }, cases };
}

describe("renderMarkdown", () => {
  it("escapes pipes and newlines inside table cells", () => {
    const md = renderMarkdown(
      file([
        {
          id: "C001",
          title: "t",
          priority: "P0",
          steps: [{ action: "a|b\nc", expected: "e|f\ng" }],
        },
      ]),
    );
    expect(md).toContain("| 1 | a\\|b<br>c | e\\|f<br>g |");
    // 原始换行不得直接进入表格行
    const row = md.split("\n").find((l) => l.startsWith("| 1 |"));
    expect(row).toBeDefined();
  });

  it("renders tags[0]/[1]/[2] as ##/###/#### heading levels", () => {
    const md = renderMarkdown(
      file([
        {
          id: "C001",
          title: "t1",
          priority: "P1",
          tags: ["模块A", "页面B", "分组C"],
          steps: [{ action: "a", expected: "e" }],
        },
        { id: "C002", title: "t2", priority: "P1", tags: ["模块A"], steps: [] },
        { id: "C003", title: "t3", priority: "P1", steps: [] },
      ]),
    );
    expect(md).toContain("\n## 模块A\n");
    expect(md).toContain("\n### 页面B\n");
    expect(md).toContain("\n#### 分组C\n");
    expect(md).toContain("\n## 未分类\n");
  });

  it("emits a case_id anchor comment before each case", () => {
    const md = renderMarkdown(file([{ id: "C001", title: "t", priority: "P0", steps: [] }]));
    expect(md).toMatch(/<!-- case_id: C001 -->\n\n##### 【P0】t/);
  });

  it("roundtrips through the archive parser with ids, steps and priority intact", () => {
    const src = file([
      {
        id: "C001",
        title: "多行步骤",
        priority: "P0",
        tags: ["模块A", "页面B"],
        precondition: "前置一\n前置二",
        steps: [{ action: "a|1\nb", expected: "e\nf" }],
      },
      { id: "C002", title: "无标签", priority: "P2", steps: [{ action: "x", expected: "y" }] },
    ]);
    const modules = parseArchiveBody(renderMarkdown(src));
    expect(modules.map((m) => m.name)).toEqual(["模块A", "未分类"]);
    const pageB = modules[0].pages.find((p) => p.name === "页面B");
    const c1 = pageB?.test_cases?.[0];
    expect(c1?.case_id).toBe("C001");
    expect(c1?.priority).toBe("P0");
    expect(c1?.preconditions).toBe("前置一\n前置二");
    expect(c1?.steps).toEqual([{ step: "a|1\nb", expected: "e\nf" }]);
    const c2 = modules[1].pages[0].test_cases?.[0];
    expect(c2?.case_id).toBe("C002");
    expect(c2?.priority).toBe("P2");
  });
});
