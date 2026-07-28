// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0277",
  "title": "验证「规则任务管理」-「批量关闭检测」功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A、B、C，点击「关闭检测」按钮",
      "expected": "二次提示\"请确认是否批量关闭检测？\""
    },
    {
      "action": "点击「取消」",
      "expected": "不影响规则原始状态"
    },
    {
      "action": "点击「确认」",
      "expected": "规则检测状态均变更为关闭检测"
    },
    {
      "action": "再次选择规则A、B、C",
      "expected": "「关闭检测」按钮置灰，仅能操作「开启检测」"
    },
    {
      "action": "观察第二天规则实例生成记录",
      "expected": "关闭检测后，不生成实例任务"
    }
  ]
} as const;

test.describe("验证「规则任务管理」-「批量关闭检测」功能正确", () => {
  test("C0277 验证「规则任务管理」-「批量关闭检测」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
