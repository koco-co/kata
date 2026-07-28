// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0703",
  "title": "验证「实例详情-监控报告」-「查看明细」弹窗标题修改",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择实例A，查看明细数据",
      "expected": "明细数据弹窗标题改为\"完整性校验+校验方法\""
    },
    {
      "action": "选择实例B，查看明细数据",
      "expected": "明细数据弹窗标题改为\"有效性校验+校验方法\""
    },
    {
      "action": "选择实例C，查看明细数据",
      "expected": "明细数据弹窗标题改为\"唯一性校验+校验方法\""
    },
    {
      "action": "选择实例D，查看明细数据",
      "expected": "明细数据弹窗标题改为\"统计性校验+校验方法\""
    }
  ]
} as const;

test.describe("验证「实例详情-监控报告」-「查看明细」弹窗标题修改", () => {
  test("C0703 验证「实例详情-监控报告」-「查看明细」弹窗标题修改", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
