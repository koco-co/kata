// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C054",
  "title": "验证规则集管理删除功能",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则集1, 点击删除",
      "expected": "二次确认弹窗, 提示: 删除规则集不会影响已经建好的规则任务，若需要删除已有规则任务，需要前往规则任务模块进行任务删除或关闭检测。请确认是否删除?"
    },
    {
      "action": "确认删除",
      "expected": "Toast提示: 删除成功"
    },
    {
      "action": "选择规则集2, 点击删除",
      "expected": "二次确认弹窗提示"
    },
    {
      "action": "确认删除",
      "expected": "Toast提示: 删除成功"
    },
    {
      "action": "选择规则集3, 点击删除",
      "expected": "二次确认弹窗提示"
    },
    {
      "action": "确认删除",
      "expected": "删除失败, 需要先删除关联的规则任务"
    },
    {
      "action": "进入「规则任务管理」, 删除规则任务B",
      "expected": "删除成功"
    },
    {
      "action": "进入「规则集管理」, 再次删除规则集3并确认",
      "expected": "删除成功"
    }
  ]
} as const;

test.describe("验证规则集管理删除功能", () => {
  test("C054 验证规则集管理删除功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
