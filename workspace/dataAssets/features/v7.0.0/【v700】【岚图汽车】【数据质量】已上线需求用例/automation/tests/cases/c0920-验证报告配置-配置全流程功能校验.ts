// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0920",
  "title": "验证「报告配置」-配置全流程功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "质量报告配置新增一条「单表报告」记录"
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
      "action": "【报告配置】如下：\n「报告名称」保持默认名称\n「报告类型」保持默认「质检式」\n「报告统计规则范围」默认选择「全部」\n「报告周期」选择「月」-「每月25号」\n「数据周期」选择「每月1号～每月30号」\n「结果展示」 选择「展示最新结果」\n「是否需要车辆信息」选择「是」",
      "expected": "报告配置成功"
    },
    {
      "action": "保存规则，查看规则详情",
      "expected": "1. 规则详情信息字段均展示正确"
    }
  ]
} as const;

test.describe("验证「报告配置」-配置全流程功能校验", () => {
  test("C0920 验证「报告配置」-配置全流程功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
