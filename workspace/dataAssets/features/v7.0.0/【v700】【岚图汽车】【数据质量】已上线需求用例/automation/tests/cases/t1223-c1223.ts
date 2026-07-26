// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1223",
  "title": "验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页精确匹配搜索与搜索逻辑提示展示正确",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【字段】",
      "expected": "字段结果页正常加载，页面展示搜索框、搜索逻辑切换控件、查询按钮、左侧资产目录树、字段结果列表和分页控件。"
    },
    {
      "action": "将搜索逻辑切换为【精确匹配】，鼠标悬浮搜索逻辑提示图标",
      "expected": "搜索逻辑显示为【精确匹配】，页面展示提示文案\"字段量级较大时建议使用精确匹配\"。"
    },
    {
      "action": "在搜索框输入\"cust_name\"，点击【查询】按钮",
      "expected": "结果列表仅展示字段名为\"cust_name\"的记录，所属表为 customer_info，所属资产目录为「客户域」；列表中不展示 cust_cert_type、cust_cert_code、order_amount 等非精确命中字段。"
    }
  ]
} as const;

test.describe("验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页精确匹配搜索与搜索逻辑提示展示正确", () => {
  test("C1223 验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页精确匹配搜索与搜索逻辑提示展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
