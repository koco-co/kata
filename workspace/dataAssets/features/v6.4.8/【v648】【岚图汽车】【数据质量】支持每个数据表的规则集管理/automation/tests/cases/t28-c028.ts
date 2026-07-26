// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C028",
  "title": "验证监控规则页面变更",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击新建监控规则, 配置监控对象后点击下一步",
      "expected": "进入【新建单表校验规则 ❯ 监控规则】配置页面"
    },
    {
      "action": "检查【监控规则】页面变更",
      "expected": "1) 新增规则包(必填)、规则类型(非必填)下拉框、引入按钮2) 原右上角按钮(添加规则、查看全局参数)隐藏"
    }
  ]
} as const;

test.describe("验证监控规则页面变更", () => {
  test("C028 验证监控规则页面变更", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
