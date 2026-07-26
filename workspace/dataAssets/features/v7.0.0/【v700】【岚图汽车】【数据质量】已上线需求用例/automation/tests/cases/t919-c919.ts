// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C919",
  "title": "验证【规则编辑-参数更新功能】",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A，点击「编辑」按钮",
      "expected": "进入规则编辑页面"
    },
    {
      "action": "【报告配置】修改如下：\n「报告名称」修改为 \"test\"\n「报告类型」保持默认「质检式」\n「报告统计规则范围」选择部分规则\n「报告周期」选择「天」\n「数据周期」选择「1天前~3天前」\n「结果展示」 选择「展示所有结果」\n「是否需要车辆信息」选择「否」",
      "expected": "报告配置修改成功"
    },
    {
      "action": "保存规则，查看规则详情",
      "expected": "规则详情信息字段均更新正确"
    }
  ]
} as const;

test.describe("验证【规则编辑-参数更新功能】", () => {
  test("C919 验证【规则编辑-参数更新功能】", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
