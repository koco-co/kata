// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1218",
  "title": "验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页清空关键字与目录条件后恢复全量结果",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【字段】",
      "expected": "字段结果页正常加载。"
    },
    {
      "action": "输入\"cust\"，选择「客户域」并点击【查询】按钮",
      "expected": "结果列表仅展示客户域下与\"cust\"相关的字段记录。"
    },
    {
      "action": "清空搜索框内容并取消左侧资产目录选择后重新点击【查询】按钮",
      "expected": "结果列表恢复展示字段全量数据，客户域与订单域的关联字段均重新可见，分页统计恢复为初始结果。"
    }
  ]
} as const;

test.describe("验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页清空关键字与目录条件后恢复全量结果", () => {
  test("C1218 验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页清空关键字与目录条件后恢复全量结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
