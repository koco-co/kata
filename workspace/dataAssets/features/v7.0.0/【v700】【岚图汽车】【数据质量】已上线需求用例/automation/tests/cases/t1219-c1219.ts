// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1219",
  "title": "验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页组合查询无匹配时显示空状态",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【字段】",
      "expected": "字段结果页正常加载。"
    },
    {
      "action": "将搜索逻辑切换为【模糊匹配】，输入\"vehicle_not_exist\"，并在左侧资产目录树选择「客户域」后点击【查询】按钮",
      "expected": "页面执行组合查询成功，不报错。"
    },
    {
      "action": "查看结果列表区域",
      "expected": "结果列表展示空状态或\"暂无数据\"提示，不展示任何字段记录，分页统计同步变为 0。"
    }
  ]
} as const;

test.describe("验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页组合查询无匹配时显示空状态", () => {
  test("C1219 验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页组合查询无匹配时显示空状态", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
