// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0956",
  "title": "验证「已配置报告」-自定义报告删除功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "选择一条「自定义报告」记录, 点击删除按钮",
      "expected": "打开二次确认弹窗\n1）title：请确认是否删除已配置报告，删除后则不会生成报告，已经生成的报告也会一并删除。\n2）\"取消、确定\"按钮"
    },
    {
      "action": "点击「取消」按钮",
      "expected": "确认框关闭，「自定义报告」记录未被删除"
    },
    {
      "action": "再次点击删除按钮, 点击「确定」",
      "expected": "1）该记录从「已配置报告」和「已生成报告」列表区域移除\n2）列表分页控件记录总数减1\n3）toast提示: \"删除成功\""
    }
  ]
} as const;

test.describe("验证「已配置报告」-自定义报告删除功能正常", () => {
  test("C0956 验证「已配置报告」-自定义报告删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
