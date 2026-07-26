// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C951",
  "title": "验证「已生成报告」-页面UI与数据显示正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "UI CHECK",
      "expected": "1) 查询项包含: 报告名称/数据表/生成时间；\n2) 表头含: 报告名称/报告类型/关联数据表/生成样式/规则范围/数据周期/生成时间/操作\n3) 按钮: 查询、重置、批量删除、 操作表头下的「下载」「报告详情」「删除」\n4) 分页控件"
    },
    {
      "action": "DATA CHECK",
      "expected": "1) 报告名称: ${最近生成的报告名称}; 报告名称过长时, 以省略号...展示\n2) 报告类型: ${最近生成的报告类型}, 支持单表/多表/自定义正则集报告\n3) 关联数据表: ${最近保存的数据表}\n4) 生成样式: 质检式\n5) 规则范围: ${最近保存的规则范围}\n6) 数据周期: ${最近保存的数据周期}\n7) 生成时间: ${最近保存的生成时间}\n8) 操作: 下载/报告详情/失败详情/删除"
    }
  ]
} as const;

test.describe("验证「已生成报告」-页面UI与数据显示正确", () => {
  test("C951 验证「已生成报告」-页面UI与数据显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
