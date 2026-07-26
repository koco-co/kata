// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C908",
  "title": "验证「规则库配置」-「内置规则」导出规则内容正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则库配置」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "点击【导出规则】按钮",
      "expected": "成功下载规则到本地"
    },
    {
      "action": "查看规则",
      "expected": "包含「合理性-字段值计算对比」规则正确详情"
    }
  ]
} as const;

test.describe("验证「规则库配置」-「内置规则」导出规则内容正确", () => {
  test("C908 验证「规则库配置」-「内置规则」导出规则内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
