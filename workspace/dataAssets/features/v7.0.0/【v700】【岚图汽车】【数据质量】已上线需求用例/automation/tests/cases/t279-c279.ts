// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C279",
  "title": "验证「任务实例页面」支持定时刷新功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A，点击「立即运行」按钮",
      "expected": "生成实例成功"
    },
    {
      "action": "点击「校验结果查询」",
      "expected": "进入「校验结果查询」页面"
    },
    {
      "action": "查看页面刷新接口",
      "expected": "默认一分钟刷新一次"
    },
    {
      "action": "变更配置，设置默认刷新时间为10S，重启服务，再次查看",
      "expected": "修改成功，接口10s刷新一次"
    }
  ]
} as const;

test.describe("验证「任务实例页面」支持定时刷新功能正确", () => {
  test("C279 验证「任务实例页面」支持定时刷新功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
