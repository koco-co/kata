// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1220",
  "title": "验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页仅选择资产目录时只展示该目录关联字段",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【字段】",
      "expected": "字段结果页正常加载。"
    },
    {
      "action": "保持搜索框为空，在左侧资产目录树选择「订单域」",
      "expected": "页面选中「订单域」目录节点，顶部关键字条件保持为空。"
    },
    {
      "action": "点击【查询】按钮并查看结果列表",
      "expected": "结果列表仅展示 order_info 表下的关联字段，如 order_amount、order_name；customer_info 表下字段不展示。"
    }
  ]
} as const;

test.describe("验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页仅选择资产目录时只展示该目录关联字段", () => {
  test("C1220 验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页仅选择资产目录时只展示该目录关联字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
