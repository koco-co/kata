// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0134",
  "title": "验证通用业务属性-编辑功能-逻辑正常",
  "steps": [
    {
      "action": "1）在编辑弹窗中，修改所有元素值\n2）点击【确定】",
      "expected": "列表中该业务属性数据更新正确"
    },
    {
      "action": "进入${DATASOURCE_TYPE}数据源类型的数据表详情页，查看「业务属性」",
      "expected": "业务属性内容更新成功"
    }
  ]
} as const;

test.describe("验证通用业务属性-编辑功能-逻辑正常", () => {
  test("C0134 验证通用业务属性-编辑功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
