// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C139",
  "title": "验证个性业务属性-子模型编辑功能-交互正常",
  "steps": [
    {
      "action": "1）进入元数据-元模型管理-${DATASOURCE_TYPE}的元模型管理页面-个性业务属性页面\n2）选择一个子模型，点击【编辑】",
      "expected": "显示编辑弹窗"
    },
    {
      "action": "输入子模型名称，点击【确定】",
      "expected": "1）弹窗关闭，提示编辑成功\n2）列表刷新"
    },
    {
      "action": "不输入子模型名称，点击【确定】",
      "expected": "提示必填项不能空"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型编辑功能-交互正常", () => {
  test("C139 验证个性业务属性-子模型编辑功能-交互正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
