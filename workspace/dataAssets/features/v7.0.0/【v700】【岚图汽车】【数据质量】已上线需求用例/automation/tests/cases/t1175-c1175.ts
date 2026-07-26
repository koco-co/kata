// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1175",
  "title": "验证【数据质量 通用配置-json格式校验管理 层级展开】5层层级展开下钻及展开图标显示逻辑",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "rootKey 行显示「+」展开图标，leafKey 行不显示「+」图标，列表展示条数按最外层级统计"
    },
    {
      "action": "点击 rootKey 行的「+」图标",
      "expected": "仅展开当前子层级：显示第二层级子节点 level2Key，level2Key 行显示「+」图标（表明还有下级），不会自动展开 level2Key 以下的更深层级"
    },
    {
      "action": "点击 level2Key 行的「+」图标",
      "expected": "仅展开当前子层级：显示第三层级子节点 level3Key，level3Key 行显示「+」图标"
    },
    {
      "action": "点击 level3Key 行的「+」图标",
      "expected": "仅展开当前子层级：显示第四层级子节点 level4Key，level4Key 行显示「+」图标"
    },
    {
      "action": "点击 level4Key 行的「+」图标",
      "expected": "level4Key 展开，显示第五层级子节点 level5Key，level5Key 行无「+」图标（已是最末层级，第5层不支持新增子层级）"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 层级展开】5层层级展开下钻及展开图标显示逻辑", () => {
  test("C1175 验证【数据质量 通用配置-json格式校验管理 层级展开】5层层级展开下钻及展开图标显示逻辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
