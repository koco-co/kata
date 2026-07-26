// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C960",
  "title": "验证【「已配置报告」】「新建报告」-功能配置正常(天)",
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
      "action": "「报告名称」输入非空不重名字符${name}\n「生成样式」选择质检式\n「规则范围」选择\"完整性\"\n「数据源」「数据库」「数据表」依次选择到Hive表vehicle_sales_df\n「报告周期」选择「天」\n「生效日期」「具体时间」保持默认\n「数据周期」选择100天前~0天前\n展示结果保持默认选项「展示全部结果」\n「是否需要车辆信息」保持默认\"否\"",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」",
      "expected": "1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」\n2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录"
    },
    {
      "action": "点击「已生成报告」",
      "expected": "1) 「已生成报告」列表中新增记录, 「数据周期」为: T-100~T, 且「报告状态」均为待生成的报告记录\n2) 等到第二天0点, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期时间}, 并且操作中的按钮由置灰状态变更为可点击状态"
    },
    {
      "action": "点击「报告详情」",
      "expected": "跳转到质量报告详情页面:\n1) 不展示「车辆数」\n2) 报告详情中统计的是报告生成时间之前的100天前~1天前内运行完成的所有任务实例的结果信息"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-功能配置正常(天)", () => {
  test("C960 验证【「已配置报告」】「新建报告」-功能配置正常(天)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
