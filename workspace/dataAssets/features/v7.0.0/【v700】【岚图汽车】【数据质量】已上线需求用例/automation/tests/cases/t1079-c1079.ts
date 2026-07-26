// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1079",
  "title": "验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】规则包增删改功能",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 编辑规则集rule01, 点击下一步",
      "expected": "进入【编辑规则集 ❯ 监控规则】配置页面"
    },
    {
      "action": "折叠/展开规则包",
      "expected": "操作成功"
    },
    {
      "action": "添加至20个规则包",
      "expected": "增加按钮消失"
    },
    {
      "action": "删除任一规则包",
      "expected": "二次弹窗确认: 删除时进行二次确认提示: 删除规则包后该规则包下已经配置好的规则会同步被删除，请确认是否删除?"
    },
    {
      "action": "二次确认删除",
      "expected": "1) Toast提示: 删除成功2) 可再次添加规则包"
    },
    {
      "action": "删除至1个规则包",
      "expected": "删除按钮消失"
    },
    {
      "action": "编辑规则包中的校验规则内容, 并保存",
      "expected": "保存并配置成功"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】规则包增删改功能", () => {
  test("C1079 验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】规则包增删改功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
