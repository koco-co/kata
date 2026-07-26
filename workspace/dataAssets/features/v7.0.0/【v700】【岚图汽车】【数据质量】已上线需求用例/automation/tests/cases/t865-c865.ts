// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C865",
  "title": "验证「编辑自定义正则」弹窗文案优化正确",
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
      "expected": "弹窗上方新增文案提示\"当前正则已存在关联的规则，若需生效需要重新编辑再保存下对应的质量规则。\""
    },
    {
      "action": "选择历史已存在的自定义正则，点击编辑按钮，弹窗UI CHECK",
      "expected": "弹窗上方新增文案提示\"当前正则已存在关联的规则，若需生效需要重新编辑再保存下对应的质量规则。\""
    }
  ]
} as const;

test.describe("验证「编辑自定义正则」弹窗文案优化正确", () => {
  test("C865 验证「编辑自定义正则」弹窗文案优化正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
