// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C374",
  "title": "验证【点击临时保存规则后，留存在当前页面不进行跳转，并提示\"规则已临时保存\"】无规则时不能临时保存（监控规则处保存）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称] test[选择数据源] doris2x_test[Doris2.x]（选择数据库） DataQuery_Doris[选择数据表] user_profile_0919[选择分区] 默认",
      "expected": "[监控对象]配置完成"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "进入[监控规则]配置页面"
    },
    {
      "action": "点击临时保存",
      "expected": "弹出提示\"请添加规则\"，不执行临时保存"
    }
  ]
} as const;

test.describe("验证【点击临时保存规则后，留存在当前页面不进行跳转，并提示\"规则已临时保存\"】无规则时不能临时保存（监控规则处保存）", () => {
  test("C374 验证【点击临时保存规则后，留存在当前页面不进行跳转，并提示\"规则已临时保存\"】无规则时不能临时保存（监控规则处保存）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
