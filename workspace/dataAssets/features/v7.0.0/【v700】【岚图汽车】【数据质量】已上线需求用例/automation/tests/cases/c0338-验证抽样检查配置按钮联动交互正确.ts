// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0338",
  "title": "验证「抽样检查配置」按钮联动交互正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "查看「抽样检查配置」开关",
      "expected": "开关默认为「关闭状态」"
    },
    {
      "action": "点击「开启」",
      "expected": "状态变更为「开启」，且展示「字段内容去重」「过滤条件设置」「抽样设置」配置项"
    }
  ]
} as const;

test.describe("验证「抽样检查配置」按钮联动交互正确", () => {
  test("C0338 验证「抽样检查配置」按钮联动交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
