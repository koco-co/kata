import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import type { CasesFile } from "../../cli/lib/cases/types.ts";
import { renderXmind } from "../../cli/lib/cases/xmind/render.ts";

const CONTEXT = { version: "v6.4.9", featureKey: "dataAssets:v6.4.9/【数据质量】需求名" };

function file(cases: CasesFile["cases"]): CasesFile {
  return {
    meta: {
      title: "需求名",
      requirement_id: "15602",
      case_module_id: "10307",
    },
    cases,
  };
}

describe("renderXmind", () => {
  it("renders the requirement module id as an L1 label and keeps preconditions on case notes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-aggregate-"));
    const out = join(dir, "需求名.xmind");
    const aggregate: CasesFile = {
      meta: {
        title: "泸州老窖定制化回归基线",
        case_module_id: "",
        layout: "requirements",
      },
      requirements: [
        {
          requirement_id: "13176",
          title: "【泸州老窖】数据资产编码管理",
          source: "禅道需求 13176",
        },
        {
          requirement_id: "16178",
          title: "【泸州老窖】新增行级权限管控",
          source: "禅道需求 16178",
        },
      ],
      cases: [
        {
          id: "C0001",
          requirement_id: "13176",
          title: "验证编码查询",
          priority: "P1",
          precondition: "已存在可查询的编码数据",
          steps: [{ action: "查询", expected: "返回结果" }],
        },
        {
          id: "C0002",
          requirement_id: "16178",
          title: "验证行级权限",
          priority: "P0",
          steps: [{ action: "访问", expected: "仅显示授权行" }],
        },
      ],
    };
    await renderXmind(aggregate, out, "dataAssets", {
      version: "v7.0.0",
      featureKey: "dataAssets:v7.0.0/【15911】【泸州老窖】【数据资产】泸州老窖定制化回归基线",
    });
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const l1s = sheets[0].rootTopic.children.attached;
    expect(l1s.map((node: { title: string }) => node.title)).toEqual([
      "【泸州老窖】数据资产编码管理",
      "【泸州老窖】新增行级权限管控",
    ]);
    expect(l1s.map((node: { labels?: string[] }) => node.labels)).toEqual([
      ["(#13176)"],
      ["(#16178)"],
    ]);
    expect(l1s.map((node: { notes?: unknown }) => node.notes)).toEqual([undefined, undefined]);
    expect(l1s[0].children.attached.map((node: { title: string }) => node.title)).toContain(
      "验证编码查询",
    );
    expect(l1s[1].children.attached.map((node: { title: string }) => node.title)).toContain(
      "验证行级权限",
    );
    const firstCase = l1s[0].children.attached.find(
      (node: { title: string }) => node.title === "验证编码查询",
    ) as { notes?: { plain?: { content?: string } } } | undefined;
    expect(firstCase?.notes?.plain?.content?.trim()).toBe("已存在可查询的编码数据");
  });

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
      CONTEXT,
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
      CONTEXT,
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
      CONTEXT,
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const children = sheets[0].rootTopic.children.attached[0].children.attached;
    expect(children.map((node: { title: string }) => node.title)).toEqual(["验证无标签用例"]);
  });

  it("skips the 未分类 placeholder tag while keeping real category tags", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-rx-unclassified-"));
    const out = join(dir, "需求名.xmind");
    await renderXmind(
      file([
        {
          id: "C0001",
          title: "验证不可合并用例",
          priority: "P1",
          tags: ["不可合并", "未分类"],
          steps: [{ action: "a", expected: "e" }],
        },
        {
          id: "C0002",
          title: "验证无真实分类用例",
          priority: "P1",
          tags: ["未分类"],
          steps: [{ action: "b", expected: "f" }],
        },
      ]),
      out,
      "dataAssets",
      CONTEXT,
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const l1 = sheets[0].rootTopic.children.attached[0];
    const category = l1.children.attached.find(
      (node: { title?: string }) => node.title === "不可合并",
    );
    expect(category?.children?.attached.map((node: { title: string }) => node.title)).toEqual([
      "验证不可合并用例",
    ]);
    expect(l1.children.attached.map((node: { title: string }) => node.title)).toContain(
      "验证无真实分类用例",
    );
    expect(JSON.stringify(l1)).not.toContain("未分类");
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
              action: `配置如下:\n- 数据源: \${DataSourceA}\n- 数据表: user_profile`,
              expected: "1) 数据源显示正确\n2) 数据表显示正确",
            },
          ],
        },
      ]),
      out,
      "dataAssets",
      CONTEXT,
    );
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const serialized = JSON.stringify(sheets[0].rootTopic);
    expect(serialized).toContain(`配置如下:\\n- 数据源: \${DataSourceA}\\n- 数据表: user_profile`);
    expect(serialized).toContain("1) 数据源显示正确\\n2) 数据表显示正确");
  });
});
