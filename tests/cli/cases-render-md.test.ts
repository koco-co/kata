import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importCases } from "../../cli/lib/cases/importers.ts";
import { renderMarkdown } from "../../cli/lib/cases/render-md.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

const CONTEXT = { version: "v1", featureKey: "dataAssets:v1.0.0/【模块】需求名" };

function file(cases: CasesFile["cases"]): CasesFile {
  return {
    meta: { title: "需求名", case_module_id: "" },
    cases,
  };
}

describe("renderMarkdown", () => {
  it("escapes pipes and newlines inside table cells", () => {
    const md = renderMarkdown(
      file([
        {
          id: "C0001",
          title: "t",
          priority: "P0",
          steps: [{ action: "a|b\nc", expected: "e|f\ng" }],
        },
      ]),
      CONTEXT,
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
          id: "C0001",
          title: "t1",
          priority: "P1",
          tags: ["模块A", "页面B", "分组C"],
          steps: [{ action: "a", expected: "e" }],
        },
        { id: "C0002", title: "t2", priority: "P1", tags: ["模块A"], steps: [] },
        { id: "C0003", title: "t3", priority: "P1", steps: [] },
      ]),
      CONTEXT,
    );
    expect(md).toContain("\n## 模块A\n");
    expect(md).toContain("\n### 页面B\n");
    expect(md).toContain("\n#### 分组C\n");
    expect(md).toContain("\n## 未分类\n");
  });

  it("emits a case_id anchor comment before each case", () => {
    const md = renderMarkdown(
      file([{ id: "C0001", title: "t", priority: "P0", steps: [] }]),
      CONTEXT,
    );
    expect(md).toMatch(/<!-- case_id: C0001 -->\n\n##### 【P0】t/);
  });

  it("roundtrips through the canonical Markdown importer with ids, steps and priority intact", async () => {
    const src = file([
      {
        id: "C0001",
        title: "多行步骤",
        priority: "P0",
        tags: ["模块A", "页面B"],
        precondition: "前置一\n前置二",
        steps: [{ action: "a|1\nb", expected: "e\nf" }],
      },
      { id: "C0002", title: "无标签", priority: "P2", steps: [{ action: "x", expected: "y" }] },
    ]);
    const dir = mkdtempSync(join(tmpdir(), "kata-render-md-"));
    const sourcePath = join(dir, "history.md");
    writeFileSync(sourcePath, renderMarkdown(src, CONTEXT));
    const imported = await importCases({
      featureDir: dir,
      sourcePath,
      name: "需求名",
      importName: "history.md",
    });
    const [c1, c2] = imported.file.cases;
    expect(c1?.id).toBe("C0001");
    expect(c1?.priority).toBe("P0");
    expect(c1?.precondition).toBe("前置一\n前置二");
    expect(c1?.steps).toEqual([{ action: "a|1\nb", expected: "e\nf" }]);
    expect(c1?.tags).toEqual(["模块A", "页面B"]);
    expect(c2?.id).toBe("C0002");
    expect(c2?.priority).toBe("P2");
    expect(c2?.tags).toBeUndefined();
  });
});
