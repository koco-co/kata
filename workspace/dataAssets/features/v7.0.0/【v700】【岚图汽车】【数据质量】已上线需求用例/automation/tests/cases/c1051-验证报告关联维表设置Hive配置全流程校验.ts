// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1051",
  "title": "验证「报告关联维表设置Hive」配置全流程校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置Hive」",
      "expected": "选择成功"
    },
    {
      "action": "hive维表设置如下：\n「数据源」选择「hive」\n「数据库」选择「databaseA」\n「数据表」选择「tableA」\n「车辆数统计字段」选择「vin」\n「车系关联字段」选择「car_config」\n「车型关联字段」选择「car_series」\n「动力类型关联字段」选择「car_power」",
      "expected": "配置成功"
    },
    {
      "action": "点击保存",
      "expected": "hive维表设置配置成功"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Hive」配置全流程校验", () => {
  test("C1051 验证「报告关联维表设置Hive」配置全流程校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
