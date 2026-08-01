import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import {
  applyProgressiveFolding,
  buildL1Labels,
  buildL1Title,
  buildRootTitle,
  createXmind,
  createXmindReplacing,
  useStepsAsNotes,
  validateInput,
} from "../../cli/lib/cases/xmind/xmind-render.ts";
import type { IntermediateJson, TestCase } from "../../cli/lib/intermediate-types.ts";
import { buildRootName, loadXmindProjectConfig } from "../../cli/lib/xmind-rules.ts";

function data(overrides: Partial<IntermediateJson["meta"]> = {}): IntermediateJson {
  return {
    meta: {
      project_name: "dataAssets",
      requirement_name: "需求A",
      version: "v6.4.9",
      ...overrides,
    },
    modules: [
      {
        name: "模块A",
        pages: [{ name: "页面B", test_cases: [{ title: "t", priority: "P1", steps: [] }] }],
      },
    ],
  };
}

function tc(steps: number): TestCase {
  return {
    title: "t",
    priority: "P1",
    steps: Array.from({ length: steps }, (_, i) => ({ step: `s${i}`, expected: `e${i}` })),
  };
}

describe("validateInput", () => {
  it("accepts a well-formed document", () => {
    expect(() => validateInput(data())).not.toThrow();
  });
  it("reports the offending module index, not just the first module", () => {
    const bad = data();
    bad.modules.push({ name: "", pages: [] } as never);
    expect(() => validateInput(bad)).toThrow(/modules\[1\]\.name/);
  });
  it("rejects a module without a pages array", () => {
    const bad = data();
    bad.modules[0] = { name: "模块A" } as never;
    expect(() => validateInput(bad)).toThrow(/modules\[0\]\.pages/);
  });
  it("rejects a page without a name", () => {
    const bad = data();
    bad.modules[0].pages.push({} as never);
    expect(() => validateInput(bad)).toThrow(/modules\[0\]\.pages\[1\]\.name/);
  });
});

describe("applyProgressiveFolding", () => {
  it("returns folded content without mutating the source tree", () => {
    const source = [
      {
        rootTopic: {
          title: "root",
          branch: "folded",
          children: { attached: [{ title: "child", children: { attached: [{ title: "leaf" }] } }] },
        },
      },
    ];
    const folded = applyProgressiveFolding(source) as typeof source;
    expect(source[0]?.rootTopic.branch).toBe("folded");
    expect(folded[0]?.rootTopic.branch).toBeUndefined();
    expect(
      (folded[0]?.rootTopic.children.attached[0] as { branch?: string } | undefined)?.branch,
    ).toBe("folded");
  });
});

describe("root title builders", () => {
  it("loads the tracked project mapping and builds the canonical title", () => {
    expect(loadXmindProjectConfig("dataAssets")).toEqual({
      root_name: "数据资产",
      zentao_module_id: "23",
    });
    expect(buildRootName("v6.4.11", "dataAssets")).toBe("数据资产v6.4.11迭代用例(#23)");
    expect(buildRootName("v6.4.5", "batchWorks")).toBe("离线开发v6.4.5迭代用例(#24)");
  });
  it("buildRootTitle delegates to the project mapping", () => {
    const meta = {
      project_name: "dataAssets",
      requirement_name: "需求A",
      version: "v6.4.11",
    };
    expect(buildRootTitle(meta)).toBe("数据资产v6.4.11迭代用例(#23)");
  });
  it("rejects an unmapped project instead of falling back to feature ids", () => {
    expect(() =>
      buildRootTitle({
        project_name: "v6.4.9/feature",
        requirement_name: "需求A",
        version: "v6.4.9",
      }),
    ).toThrow(/未配置 XMind 项目映射/);
  });
});

describe("L1 metadata", () => {
  it("appends the optional case module id and labels the requirement id", () => {
    const meta = {
      project_name: "dataAssets",
      requirement_name: "【数据质量】邮件明细(#99999)",
      requirement_id: "15602",
      case_module_id: "10307",
    };
    expect(buildL1Title(meta)).toBe("【数据质量】邮件明细(#10307)");
    expect(buildL1Labels(meta)).toEqual(["(#15602)"]);
  });
  it("omits an empty case module suffix and a missing requirement label", () => {
    const meta = {
      project_name: "batchWorks",
      requirement_name: "【建投】导入数据支持中途停止测试",
      case_module_id: "",
    };
    expect(buildL1Title(meta)).toBe("【建投】导入数据支持中途停止测试");
    expect(buildL1Labels(meta)).toEqual([]);
  });
});

describe("useStepsAsNotes", () => {
  it("folds steps into notes only at 3+ steps by default", () => {
    expect(useStepsAsNotes(tc(2), { stepsAsNotes: true })).toBe(false);
    expect(useStepsAsNotes(tc(3), { stepsAsNotes: true })).toBe(true);
    expect(useStepsAsNotes(tc(3), {})).toBe(false);
  });
  it("honors an explicit threshold", () => {
    expect(useStepsAsNotes(tc(2), { stepsAsNotes: true, stepsAsNotesMinSteps: 2 })).toBe(true);
  });
});

describe("createXmindReplacing", () => {
  it("atomically replaces an existing xmind", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-cr-"));
    const out = join(dir, "a.xmind");
    await createXmind(data(), out);
    await createXmindReplacing(data({ requirement_name: "需求B" }), out);
    const zip = await JSZip.loadAsync(readFileSync(out));
    const content = zip.file("content.json");
    if (!content) throw new Error("missing content.json");
    const sheets = JSON.parse(await content.async("string"));
    const titles = sheets[0].rootTopic.children.attached.map((n: { title?: string }) => n.title);
    expect(titles).toEqual(["需求B"]);
    expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });
});
