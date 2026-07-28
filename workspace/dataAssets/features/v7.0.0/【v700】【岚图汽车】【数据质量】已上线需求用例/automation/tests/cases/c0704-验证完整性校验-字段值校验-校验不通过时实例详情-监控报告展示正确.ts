// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0704",
  "title": "验证「完整性校验-字段值校验」-校验不通过时「实例详情-监控报告」展示正确",
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
      "expected": "支持查看不通过校验的明细数据,校验字段标红"
    },
    {
      "action": "下载明细数据",
      "expected": "下载成功，数据展示正确， 校验字段标红"
    }
  ]
} as const;

test.describe("验证「完整性校验-字段值校验」-校验不通过时「实例详情-监控报告」展示正确", () => {
  test("C0704 验证「完整性校验-字段值校验」-校验不通过时「实例详情-监控报告」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
