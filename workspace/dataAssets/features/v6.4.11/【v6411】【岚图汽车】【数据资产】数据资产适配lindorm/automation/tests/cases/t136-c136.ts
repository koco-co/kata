// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C136",
  "title": "验证通用业务属性-删除功能-逻辑正常",
  "steps": [
    {
      "action": "删除业务属性${SX}",
      "expected": "列表不显示业务属性${SX}"
    },
    {
      "action": "进入${DATASOURCE_TYPE}数据源类型的数据表详情页，查看「业务属性」",
      "expected": "该业务属性不显示"
    }
  ]
} as const;

test.describe("验证通用业务属性-删除功能-逻辑正常", () => {
  test("C136 验证通用业务属性-删除功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
