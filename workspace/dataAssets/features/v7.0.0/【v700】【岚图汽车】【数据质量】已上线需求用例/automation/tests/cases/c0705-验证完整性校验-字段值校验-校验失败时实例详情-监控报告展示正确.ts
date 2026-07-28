// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0705",
  "title": "验证「完整性校验-字段值校验」-校验失败时「实例详情-监控报告」展示正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择实例A，查看监控报告",
      "expected": "进入成功"
    },
    {
      "action": "查看明细数据",
      "expected": "校验失败的实例不展示「明细数据」"
    },
    {
      "action": "点击「查看日志」按钮",
      "expected": "展示任务失败日志详细信息"
    }
  ]
} as const;

test.describe("验证「完整性校验-字段值校验」-校验失败时「实例详情-监控报告」展示正确", () => {
  test("C0705 验证「完整性校验-字段值校验」-校验失败时「实例详情-监控报告」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
