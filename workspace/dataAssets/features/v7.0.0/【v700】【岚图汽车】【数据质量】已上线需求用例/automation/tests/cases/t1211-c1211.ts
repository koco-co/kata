// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1211",
  "title": "验证 「元数据」中 Doris 3.x 数据表查询和表数量显示正常",
  "steps": [
    {
      "action": "进入【数据资产】-【元数据】-【数据地图】页面",
      "expected": "进入成功"
    },
    {
      "action": "UI CHECK",
      "expected": "「表来源」中新增Doris 3.x数据源, 并显示5条数据"
    },
    {
      "action": "点击「表来源」中的Doris 3.x",
      "expected": "1) 跳转至数据表查询列表界面2) 自动载入Doris 3.x数据源类型的查询结果, 显示5条数据表"
    },
    {
      "action": "进入「数据地图」主页面, 输入关键词vehicle_info_part 并查询",
      "expected": "1) 显示5条Doris 3.x数据表2) 表名中的关键词被标红3) 表名右侧的icon显示Doris 3.x"
    },
    {
      "action": "选择Doris 3.x表进入表详情页面, 检查表来源显示",
      "expected": "表详情-基本信息-表来源中显示为Doris 3.x"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 数据表查询和表数量显示正常", () => {
  test("C1211 验证 「元数据」中 Doris 3.x 数据表查询和表数量显示正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
