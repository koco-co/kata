import { describe, expect, it } from "bun:test";
import type { CaseItem } from "../../cli/lib/cases/types.ts";
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
