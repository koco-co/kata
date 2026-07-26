// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C133",
  "title": "验证通用业务属性-编辑功能-交互正常",
  "steps": [
    {
      "action": "1）进入元数据-元模型管理-${DATASOURCE_TYPE}的元模型管理页面-通用业务属性页面\n2）选择一个业务属性，点击【编辑】",
      "expected": "显示编辑弹窗"
    },
    {
      "action": "只输入必填项，点击【确定】",
      "expected": "1）弹窗关闭，提示编辑成功\n2）列表刷新"
    },
    {
      "action": "存在一个必填项未输入，点击【确定】",
      "expected": "提示必填项不能空"
    },
    {
      "action": "输入所有表单元素值，点击【确定】",
      "expected": "1）弹窗关闭，提示编辑成功\n2）列表刷新"
    },
    {
      "action": "查看不可编辑项",
      "expected": "属性名、属性类型为不可编辑状态"
    }
  ]
} as const;

test.describe("验证通用业务属性-编辑功能-交互正常", () => {
  test("C133 验证通用业务属性-编辑功能-交互正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
