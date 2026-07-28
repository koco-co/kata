// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0012",
  "title": "验证通用业务属性-进入Doris数据表详情查看业务属性",
  "steps": [
    {
      "action": "进入【元数据】-【数据地图】页面，搜索 `test_table` 并打开表详情，切换到【业务属性】页签",
      "expected": "页面展示业务属性列表；能看到前序新增的枚举/string/bigint/树形目录属性名称"
    }
  ]
} as const;

test.describe("验证通用业务属性-进入Doris数据表详情查看业务属性", () => {
  test("C0012 验证通用业务属性-进入Doris数据表详情查看业务属性", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
