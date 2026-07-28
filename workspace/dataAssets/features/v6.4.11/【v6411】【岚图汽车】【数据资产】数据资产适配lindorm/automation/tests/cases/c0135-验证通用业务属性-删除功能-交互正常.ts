// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0135",
  "title": "验证通用业务属性-删除功能-交互正常",
  "steps": [
    {
      "action": "1）进入元数据-元模型管理-${DATASOURCE_TYPE}的元模型管理页面-通用业务属性页面\n2）选择一个业务属性，点击【删除】",
      "expected": "显示二次确认弹窗"
    },
    {
      "action": "二次确认后",
      "expected": "提示删除成功，列表刷新"
    }
  ]
} as const;

test.describe("验证通用业务属性-删除功能-交互正常", () => {
  test("C0135 验证通用业务属性-删除功能-交互正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
