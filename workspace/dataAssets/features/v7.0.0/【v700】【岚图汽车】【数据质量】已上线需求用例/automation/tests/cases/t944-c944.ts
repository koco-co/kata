// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C944",
  "title": "验证「已生成报告」-报告状态显示正常",
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
      "action": "「报告名称」输入非空不重名字符${name}\n「生成样式」选择质检式\n「规则范围」保持默认\"全部\"\n「数据源」「数据库」「数据表」依次选择到Hive表vehicle_sales_df\n「报告周期」选择一次性\n「数据周期」选择T-1 ~ T\n展示结果选择「展示全部结果」\n「是否需要车辆信息」保持默认\"是\"",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」",
      "expected": "1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」\n2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录"
    },
    {
      "action": "切换到「已生成报告」页签",
      "expected": "切换成功"
    },
    {
      "action": "UI CHECK",
      "expected": "1) 存在一条报告状态为「待生成」的报告记录\n2) 待生成时，「生成时间」不展示，操作按钮(下载/报告详情/删除)均置灰, 无法操作\n3) 等待一段时间后, 报告状态由「待生成」变更为「生成中」\n4) 生成中时，「生成时间」不展示，操作按钮(下载/报告详情/删除)均置灰, 无法操作\n5) 等待一段时间后, 报告状态由「生成中」变更为「已生成」\n6) 已生成时，展示「生成时间」，操作按钮(下载/报告详情/删除)均可点击"
    }
  ]
} as const;

test.describe("验证「已生成报告」-报告状态显示正常", () => {
  test("C944 验证「已生成报告」-报告状态显示正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
