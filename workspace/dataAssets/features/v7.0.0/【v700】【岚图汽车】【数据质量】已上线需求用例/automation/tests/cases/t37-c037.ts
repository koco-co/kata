// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C037",
  "title": "验证「新建监控规则」流程正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮",
      "expected": "直接进入「监控对象」配置页面"
    },
    {
      "action": "「规则名称」输入\"test\"\n「选择数据源」自动引入「datasource_type」\n「选择数据库」自动引入「database1」\n「选择数据表」 选择 「table」\n「输入分区」 选择「选择已有分区」-常规表/多级分区表",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」，配置「周期调度」，完成",
      "expected": "配置成功"
    },
    {
      "action": "立即运行任务",
      "expected": "任务实例结果正确"
    },
    {
      "action": "选择\"test\"规则，编辑修改「选择数据源」「选择数据库」「数据表」",
      "expected": "修改成功"
    },
    {
      "action": "保存配置，下一步，完成",
      "expected": "修改配置信息完成"
    },
    {
      "action": "立即运行任务",
      "expected": "任务实例结果正确(校验库表修改成功)"
    }
  ]
} as const;

test.describe("验证「新建监控规则」流程正确", () => {
  test("C037 验证「新建监控规则」流程正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
