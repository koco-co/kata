// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C918",
  "title": "验证「数据质量报告」-「报告统计规则范围」功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "车辆信息模块不展示"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」",
      "expected": "报告名称展示正确"
    },
    {
      "action": "规则全选(完整性校验，有效性校验，唯一性校验，统计性校验)",
      "expected": "各规则模块均勾选成功，配置项展示正确"
    },
    {
      "action": "规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入【调度配置】页面"
    },
    {
      "action": "【报告配置】如下：\n「报告名称」保持默认名称\n「报告类型」保持默认「质检式」\n「报告统计规则范围」默认选择「全部」\n「报告周期」选择「月」-「每月25号」\n「数据周期」选择「每月1号～每月30号」\n「结果展示」 选择「展示最新结果」\n「是否需要车辆信息」选择「是」",
      "expected": "报告配置成功"
    },
    {
      "action": "保存并立即运行当前规则",
      "expected": "规则运行完成"
    },
    {
      "action": "进入【数据质量报告】页面，查看报告结果",
      "expected": "1. 报告内容包含当前规则的所有校验规则1号～30号最新结果"
    },
    {
      "action": "编辑当前规则的「报告配置」如下：\n「报告名称」修改为 \"test\"\n「报告类型」保持默认「质检式」\n「报告统计规则范围」仅选择「完整性校验」\n「报告周期」选择「天」\n「数据周期」选择「1天前~3天前」\n「结果展示」 选择「展示所有结果」\n「是否需要车辆信息」选择「否」",
      "expected": "报告配置修改成功"
    },
    {
      "action": "保存并立即运行当前规则",
      "expected": "规则运行完成"
    },
    {
      "action": "进入【数据质量报告】页面，查看报告结果",
      "expected": "1. 报告内容仅展示「完整性校验规则」1-3天前的所有结果"
    }
  ]
} as const;

test.describe("验证「数据质量报告」-「报告统计规则范围」功能校验", () => {
  test("C918 验证「数据质量报告」-「报告统计规则范围」功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
