// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C961",
  "title": "验证【「已配置报告」】「新建报告」-功能配置正常(一次性)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建报告」按钮",
      "expected": "弹出「新建报告」弹窗"
    },
    {
      "action": "「报告名称」输入非空不重名字符${name}\n「生成样式」选择质检式\n「规则范围」选择\"完整性\"\n「数据源」「数据库」「数据表」依次选择到Hive表vehicle_sales_df\n「报告周期」选择一次性\n「数据周期」选择${当天日期}~${当天日期}\n展示结果保持默认选项「展示最新结果」\n「是否需要车辆信息」保持默认\"是\"",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」",
      "expected": "1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」\n2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录"
    },
    {
      "action": "点击「已生成报告」",
      "expected": "1) 「已生成报告」列表中新增一条「数据周期」在T~T, 且「报告状态」为待生成的报告记录\n2) 等待一段时间后, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期 时间}\n3) 操作中的按钮由置灰状态变更为可点击状态"
    },
    {
      "action": "点击「报告详情」",
      "expected": "跳转到质量报告详情页面:\n1) 报告详情「规则校验明细」中的单表规则部分显示一条「完整性检验」且最后校验时间为当前时间的规则记录\n2) 报告详情中统计的是${当天日期}内运行完成的所有任务实例的结果信息"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-功能配置正常(一次性)", () => {
  test("C961 验证【「已配置报告」】「新建报告」-功能配置正常(一次性)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
