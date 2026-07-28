// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0857",
  "title": "验证「内置规则」页面「导出规则库」功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「导出规则库」按钮",
      "expected": "提示\"请确认是否导出规则库\""
    },
    {
      "action": "点击\"取消\"",
      "expected": "提示隐藏，不导出规则库数据"
    },
    {
      "action": "点击\"确认\"",
      "expected": "导出规则库数据，表命名为\"内置规则库_currentTime()\""
    },
    {
      "action": "查看内置规则库内容",
      "expected": "1. 正确展示所有检测规则明细内容"
    },
    {
      "action": "子主题 6",
      "expected": "2. 水印信息展示正确"
    }
  ]
} as const;

test.describe("验证「内置规则」页面「导出规则库」功能正确", () => {
  test("C0857 验证「内置规则」页面「导出规则库」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
