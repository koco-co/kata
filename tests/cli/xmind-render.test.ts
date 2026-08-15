import { describe, expect, it } from "bun:test";
import JSZip from "jszip";
import type { CaseItem, CasesFile } from "../../cli/lib/cases/types.ts";
import { renderXmindBuffer } from "../../cli/lib/cases/xmind/render.ts";
import {
  applyAllRightL1Layout,
  applyProgressiveFolding,
  buildL1Labels,
  buildL1Title,
  buildRootTitle,
  shouldUseStepsAsNotes,
} from "../../cli/lib/cases/xmind/xmind-render.ts";
import { buildRootName, loadXmindProjectConfig } from "../../cli/lib/xmind-rules.ts";

function tc(steps: number): CaseItem {
  return {
    id: "C0001",
    title: "t",
    priority: "P1",
    steps: Array.from({ length: steps }, (_, i) => ({ action: `s${i}`, expected: `e${i}` })),
  };
}

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

describe("L1 right layout", () => {
  it("sets the root structure so all L1 branches render on the right", () => {
    const content = [{ rootTopic: { title: "root", children: { attached: [] } } }];
    applyAllRightL1Layout(content);
    expect(
      (content[0] as { rootTopic: { structureClass?: string } }).rootTopic.structureClass,
    ).toBe("org.xmind.ui.logic.right");
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

describe("shouldUseStepsAsNotes", () => {
  it("folds steps into notes only at 3+ steps by default", () => {
    expect(shouldUseStepsAsNotes(tc(2), { stepsAsNotes: true })).toBe(false);
    expect(shouldUseStepsAsNotes(tc(3), { stepsAsNotes: true })).toBe(true);
    expect(shouldUseStepsAsNotes(tc(3), {})).toBe(false);
  });
  it("honors an explicit threshold", () => {
    expect(shouldUseStepsAsNotes(tc(2), { stepsAsNotes: true, stepsAsNotesMinSteps: 2 })).toBe(
      true,
    );
  });
});

describe("requirements layout L1 labels", () => {
  const file = (requirementId = "13183", moduleId?: string): CasesFile => ({
    meta: {
      title: "T",
      feature_id: "f",
      project_id: "data-assets",
      case_module_id: "10826",
      layout: "requirements",
      requirement_id: "15911",
    },
    requirements: [
      {
        requirement_id: requirementId,
        title: "R1",
        source: "x",
        ...(moduleId ? { module_id: moduleId } : {}),
      },
    ],
    cases: [
      {
        id: "C0001",
        title: "c1",
        priority: "P1",
        requirement_id: requirementId,
        steps: [{ action: "a", expected: "e" }],
      },
    ],
  });

  async function l1Topics(source: CasesFile): Promise<Array<{ title: string; labels: string[] }>> {
    const buffer = await renderXmindBuffer(source, "dataAssets", {
      version: "v7.0.0",
      featureKey: "f",
    });
    const zip = await JSZip.loadAsync(buffer);
    const contentEntry = zip.file("content.json");
    if (!contentEntry) throw new Error("missing content.json");
    const content = JSON.parse(await contentEntry.async("string"));
    return content[0].rootTopic.children.attached.map(
      (topic: { title: string; labels?: string[] }) => ({
        title: topic.title,
        labels: topic.labels ?? [],
      }),
    );
  }

  it("appends the ZenTao module id to the L1 title and tags the requirement id", async () => {
    expect(await l1Topics(file("15911", "10834"))).toEqual([
      { title: "R1 (#10834)", labels: ["(#15911)"] },
    ]);
  });

  it("tags the sub-requirement id when it differs from the parent id", async () => {
    expect(await l1Topics(file("13183"))).toEqual([{ title: "R1", labels: ["(#13183)"] }]);
  });
});
