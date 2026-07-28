// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1221",
  "title": "验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页支持关键字与资产目录组合查询",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【字段】",
      "expected": "字段结果页正常加载。"
    },
    {
      "action": "将搜索逻辑切换为【模糊匹配】，在搜索框输入\"name\"，并在左侧资产目录树选择「客户域」",
      "expected": "页面允许同时保留关键字条件和资产目录条件。"
    },
    {
      "action": "点击【查询】按钮并查看结果列表",
      "expected": "结果列表仅展示「客户域」目录下名称相关的字段，如 cust_name；位于「订单域」的 order_name 不展示。"
    }
  ]
} as const;

test.describe("验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页支持关键字与资产目录组合查询", () => {
  test("C1221 验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页支持关键字与资产目录组合查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
