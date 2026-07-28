// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0929",
  "title": "验证「调度属性」页面新增「报告配置」模块",
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
      "action": "配置「数据源」「数据库」「数据表」，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "【完整性校验】规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入【调度配置】页面"
    },
    {
      "action": "【调度配置】页面UI CHECK",
      "expected": "页面新增【报告配置】模块"
    },
    {
      "action": "【报告配置】模块UI CHECK",
      "expected": "展示\n「报告名称」输入框\n「报告类型」选择框\n「报告统计规则范围」选择框\n「报告周期」选择框\n「数据周期」选择框\n「展示最新结果、展示全部结果」单选框\n「是否需要车辆信息」 单选框"
    }
  ]
} as const;

test.describe("验证「调度属性」页面新增「报告配置」模块", () => {
  test("C0929 验证「调度属性」页面新增「报告配置」模块", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
