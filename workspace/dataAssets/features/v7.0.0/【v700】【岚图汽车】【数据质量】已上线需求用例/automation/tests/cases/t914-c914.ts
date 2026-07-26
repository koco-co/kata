// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C914",
  "title": "验证「数据质量报告」中 Doris 3.x 数据源「自定义报告」的配置和生成功能正常",
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
      "action": "「报告名称」输入非空不重名字符${name}「生成样式」选择质检式「规则范围」选择\"完整性\"「数据源」「数据库」「数据表」依次选择Doris 3.x表「报告周期」选择一次性「数据周期」选择${当天日期}~${当天日期}展示结果保持默认选项「展示最新结果」「是否需要车辆信息」保持默认\"是\"",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」",
      "expected": "1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录"
    },
    {
      "action": "点击「已生成报告」",
      "expected": "1) 「已生成报告」列表中新增一条「数据周期」在T~T, 且「报告状态」为待生成的报告记录2) 等待一段时间后, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期 时间}3) 操作中的按钮由置灰状态变更为可点击状态"
    },
    {
      "action": "点击「报告详情」",
      "expected": "跳转到质量报告详情页面:1) 展示「车辆数」2) 报告详情「规则校验明细」中的单表规则部分显示一条「完整性检验」且最后校验时间为当前时间的规则记录3) 报告详情中统计的是${当天日期}内运行完成的所有任务实例的结果信息"
    }
  ]
} as const;

test.describe("验证「数据质量报告」中 Doris 3.x 数据源「自定义报告」的配置和生成功能正常", () => {
  test("C914 验证「数据质量报告」中 Doris 3.x 数据源「自定义报告」的配置和生成功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
