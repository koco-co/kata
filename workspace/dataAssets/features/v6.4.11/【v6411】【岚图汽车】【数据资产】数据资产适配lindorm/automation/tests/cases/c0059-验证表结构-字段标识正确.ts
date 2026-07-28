// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0059",
  "title": "验证【表结构】-【字段】标识正确",
  "steps": [
    {
      "action": "当前字段为分区字段",
      "expected": "展示分区字段图标，数据hover提示“分区字段”"
    },
    {
      "action": "当前字段映射标准",
      "expected": "1. 展示标准图标，鼠标hover提示“标准”\n2. 点击字段名称，展示标准详情弹窗"
    },
    {
      "action": "当前字段为分桶字段",
      "expected": "展示分桶字段图标，数据hover提示“分桶字段”"
    }
  ]
} as const;

test.describe("验证【表结构】-【字段】标识正确", () => {
  test("C0059 验证【表结构】-【字段】标识正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
