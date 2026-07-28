// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0270",
  "title": "验证「已配置报告」-单表报告配置功能正常",
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
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「字段级」\n「字段」选择「retail_status」\n「统计函数」 选择「字段值校验」\n「期望值」选择「包含」「已交付」\n「过滤条件」 输入「mileage_km<=5」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」，配置「调度属性」:\n「报告名称」保持默认名称\n「报告类型」保持默认「质检式」\n「报告统计规则范围」默认选择「全部」\n「报告周期」选择「月」-「每月30号」\n「数据周期」选择「每月1号～每月25号」\n「结果展示」 选择「展示最新结果」\n「是否需要车辆信息」选择「是」",
      "expected": "调度属性配置完成"
    },
    {
      "action": "点击「完成」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "1) 进入成功\n2) 「已配置报告」中新增一条报告类型为「单表报告」的记录"
    }
  ]
} as const;

test.describe("验证「已配置报告」-单表报告配置功能正常", () => {
  test("C0270 验证「已配置报告」-单表报告配置功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
