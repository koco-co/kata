// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0864",
  "title": "验证「新增自定义正则」弹窗新增「测试数据」栏",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新增自定义正则」按钮",
      "expected": "弹「新增自定义正则弹窗」"
    },
    {
      "action": "弹窗UI CHECK",
      "expected": "弹窗最下方新增「测试数据」「正则匹配测试」模块内容"
    }
  ]
} as const;

test.describe("验证「新增自定义正则」弹窗新增「测试数据」栏", () => {
  test("C0864 验证「新增自定义正则」弹窗新增「测试数据」栏", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
