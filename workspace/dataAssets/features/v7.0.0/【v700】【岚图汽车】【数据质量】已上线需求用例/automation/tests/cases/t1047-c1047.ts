// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1047",
  "title": "验证「报告关联维表设置Doris」二级页面校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置DORIS」",
      "expected": "选择成功"
    },
    {
      "action": "页面UI CHECK",
      "expected": "正确展示\nTAB 标题「报告关联维表设置(hive)」\n「数据源」必选框\n「catalog」必选框\n「数据库」必选框\n「数据表」必选框\n「车辆数统计字段」必选框\n「车系关联字段」必选框\n「车型关联字段」必选框\n「动力类型关联字段」必选框"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Doris」二级页面校验", () => {
  test("C1047 验证「报告关联维表设置Doris」二级页面校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
