// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C486",
  "title": "验证“引入数据源”弹窗列表展示待引入数据源正确",
  "steps": [
    {
      "action": "license开启了“引入外部数据源”",
      "expected": "“引入数据源”弹窗列表展示数据为：数据源中心授权给资产的所有未引入的数据源"
    },
    {
      "action": "license关闭了“引入外部数据源”",
      "expected": "“引入数据源”弹窗列表展示数据为：数据源中心授权给资产的所有未引入的meta数据源；数据源管理列表不显示“虚拟数据源”以及跳转至数据源中心的提示"
    }
  ]
} as const;

test.describe("验证“引入数据源”弹窗列表展示待引入数据源正确", () => {
  test("C486 验证“引入数据源”弹窗列表展示待引入数据源正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
