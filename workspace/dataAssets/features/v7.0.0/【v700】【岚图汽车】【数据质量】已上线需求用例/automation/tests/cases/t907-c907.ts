// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C907",
  "title": "验证「规则库配置」-「内置规则」列表新增「多表字段值对比」规则",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则库配置」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "查看列表",
      "expected": "新增多表字段值对比\n显示为：\n规则名称-多表字段值对比；\n规则解释-多表字段值的计算对比；\n规则分类-合理性校验\n关联范围-多表\n规则描述-比较多表关联后字段值的计算逻辑是否符合要求，支持将计算结果进行对比或计算结果值的值域判断"
    }
  ]
} as const;

test.describe("验证「规则库配置」-「内置规则」列表新增「多表字段值对比」规则", () => {
  test("C907 验证「规则库配置」-「内置规则」列表新增「多表字段值对比」规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
