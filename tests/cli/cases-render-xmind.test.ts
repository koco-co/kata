import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { casesToIntermediate, renderXmind } from "../../cli/lib/cases/render-xmind.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";
import { UNCLASSIFIED } from "../../cli/lib/xmind-render.ts";

function file(cases: CasesFile["cases"]): CasesFile {
  return {
    meta: {
      title: "需求名",
      version: "v6.4.9",
      feature_id: "v6.4.9/g",
      requirement_id: "15602",
      case_module_id: "10307",
    },
    cases,
  };
}

describe("casesToIntermediate", () => {
  it("uses UNCLASSIFIED for the implicit page instead of duplicating the module name", () => {
    const data = casesToIntermediate(
      file([
        {
          id: "C0001",
          title: "t",
          priority: "P1",
          tags: ["模块A"],
          steps: [{ action: "a", expected: "e" }],
        },
      ]),
      "dataAssets",
    );
    expect(data.modules[0].name).toBe("模块A");
    expect(data.modules[0].pages[0].name).toBe(UNCLASSIFIED);
  });
});

describe("renderXmind", () => {
  it("flattens page-less cases under the module (no 模块>同名模块 nesting)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-"));
    const out = join(dir, "需求名.xmind");
    await renderXmind(
      file([
        {
          id: "C0001",
          title: "t",
          priority: "P1",
          tags: ["模块A"],
          steps: [{ action: "a", expected: "e" }],
        },
      ]),
      out,
      "dataAssets",
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const l1 = sheets[0].rootTopic.children.attached[0];
    expect(sheets[0].rootTopic.title).toBe("数据资产v6.4.9迭代用例(#23)");
    expect(sheets[0].rootTopic.branch).toBeUndefined();
    expect(l1.title).toBe("需求名(#10307)");
    expect(l1.labels).toEqual(["(#15602)"]);
    expect(l1.branch).toBe("folded");
    const mod = l1.children.attached.find((n: { title?: string }) => n.title === "模块A");
    expect(mod).toBeDefined();
    expect(mod.branch).toBe("folded");
    const titles = (mod.children?.attached ?? []).map((n: { title?: string }) => n.title);
    expect(titles).toContain("t");
    expect(titles).not.toContain("模块A");
  });

  it("replaces an existing file atomically and leaves no temp files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-"));
    const out = join(dir, "需求名.xmind");
    writeFileSync(out, "corrupted-leftover");
    await renderXmind(
      file([{ id: "C0001", title: "t", priority: "P1", steps: [{ action: "a", expected: "e" }] }]),
      out,
      "dataAssets",
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    expect(zip.file("content.json")).not.toBeNull();
    expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("places untagged cases directly under L1 without a 未分类 node", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-"));
    const out = join(dir, "需求名.xmind");
    await renderXmind(
      file([
        {
          id: "C0001",
          title: "验证无标签用例",
          priority: "P1",
          steps: [{ action: "a", expected: "e" }],
        },
      ]),
      out,
      "dataAssets",
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const children = sheets[0].rootTopic.children.attached[0].children.attached;
    expect(children.map((node: { title: string }) => node.title)).toEqual(["验证无标签用例"]);
  });

  it("keeps canonical newlines in form items inside xmind topics", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-"));
    const out = join(dir, "需求名.xmind");
    await renderXmind(
      file([
        {
          id: "C0001",
          title: "验证表单",
          priority: "P1",
          steps: [
            {
              action: "配置如下:\n- 数据源: ${DataSourceA}\n- 数据表: user_profile",
              expected: "1) 数据源显示正确\n2) 数据表显示正确",
            },
          ],
        },
      ]),
      out,
      "dataAssets",
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const serialized = JSON.stringify(sheets[0].rootTopic);
    expect(serialized).toContain("配置如下:\\n- 数据源: ${DataSourceA}\\n- 数据表: user_profile");
    expect(serialized).toContain("1) 数据源显示正确\\n2) 数据表显示正确");
  });
});
