// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C367",
  "title": "验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】新建监控规则时，监控对象仅选择数据源（数据库、数据表未选择）的情况下数据预览无反应",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称] test[选择数据源] doris2x_test[Doris2.x]（选择数据库） 不作选择[选择数据表] 不作选择[选择分区] 不作编辑",
      "expected": "[监控对象]配置完成"
    },
    {
      "action": "点击【数据预览】按钮",
      "expected": "无反应"
    }
  ]
} as const;

test.describe("验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】新建监控规则时，监控对象仅选择数据源（数据库、数据表未选择）的情况下数据预览无反应", () => {
  test("C367 验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】新建监控规则时，监控对象仅选择数据源（数据库、数据表未选择）的情况下数据预览无反应", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
