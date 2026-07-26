// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C939",
  "title": "验证「已生成报告」-批量删除功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "勾选3条报告记录, 点击批量删除按钮",
      "expected": "打开二次确认弹窗\n1）title：请确认是否删除已选择报告。\n2）\"取消、确定\"按钮"
    },
    {
      "action": "点击「取消」按钮",
      "expected": "确认框关闭，报告记录未被删除"
    },
    {
      "action": "再次点击批量删除按钮, 点击「确定」",
      "expected": "1）多条记录从「已生成报告」列表区域移除\n2）列表分页控件记录总数减3\n3）toast提示: \"删除成功\""
    }
  ]
} as const;

test.describe("验证「已生成报告」-批量删除功能正常", () => {
  test("C939 验证「已生成报告」-批量删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
