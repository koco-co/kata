// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C954",
  "title": "验证「已配置报告」-质量报告编辑功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择一条「自定义报告」的记录, 点击「编辑」按钮, 修改内容如下:\n「报告名称」输入非空不重名字符${name}\n「生成样式」选择质检式\n「规则范围」保持默认\"全部\"\n「报告周期」选择一次性\n「数据周期」选择T-1 ~ T\n展示结果选择「展示全部结果」\n「是否需要车辆信息」保持默认\"是\"",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」",
      "expected": "1) 「编辑报告」表单提交成功, 并有toast提示: 「编辑成功」\n2) 「已配置报告」中对应报告记录更新为修改后的内容"
    },
    {
      "action": "选择一条「单表报告」的记录, 点击「编辑」按钮, 修改内容如下:\n「报告名称」输入非空不重名字符${name}\n「生成样式」选择质检式\n「规则范围」保持默认\"全部\"\n「报告周期」选择一次性\n「数据周期」选择T-1 ~ T\n展示结果选择「展示全部结果」\n「是否需要车辆信息」保持默认\"是\"",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」",
      "expected": "1) 「编辑报告」表单提交成功, 并有toast提示: 「编辑成功」\n2) 「已配置报告」中对应报告记录更新为修改后的内容"
    }
  ]
} as const;

test.describe("验证「已配置报告」-质量报告编辑功能正常", () => {
  test("C954 验证「已配置报告」-质量报告编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
