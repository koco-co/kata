// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C104",
  "title": "验证「完整性校验」-「字段级-字段值校验」编辑功能正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A，点击「编辑」按钮",
      "expected": "进入规则「编辑页面」"
    },
    {
      "action": "编辑「字段」删除「id」\n编辑「字段间规则逻辑」为「or」\n编辑「字段期望值校验方式」\n编辑「过滤条件」 id >1000\n编辑「强弱规则」 为「强」\n编辑「规则描述」为 「test desc」",
      "expected": "编辑成功"
    },
    {
      "action": "保存规则，查看规则详情页字段信息",
      "expected": "更新成功"
    },
    {
      "action": "运行任务实例",
      "expected": "按更新后逻辑运行"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「字段级-字段值校验」编辑功能正确", () => {
  test("C104 验证「完整性校验」-「字段级-字段值校验」编辑功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
