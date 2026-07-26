// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C862",
  "title": "验证「编辑自定义正则」弹窗「正则匹配测试」功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择自定义正则A，点击「编辑」按钮",
      "expected": "弹「新增自定义正则弹窗」"
    },
    {
      "action": "「测试数据」文本框内输入\"1\"，点击「正则匹配测试」按钮",
      "expected": "符合正则，展示绿色通过图标"
    },
    {
      "action": "「测试数据」文本框内输入\"！@#¥%……&\"，点击「正则匹配测试」按钮",
      "expected": "不符合正则，展示红色不通过图标"
    }
  ]
} as const;

test.describe("验证「编辑自定义正则」弹窗「正则匹配测试」功能正确", () => {
  test("C862 验证「编辑自定义正则」弹窗「正则匹配测试」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
