// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0222",
  "title": "验证数据标准-版本比对",
  "steps": [
    {
      "action": "勾选一个版本",
      "expected": "版本对比按钮置灰，不可点击"
    },
    {
      "action": "勾选两个版本",
      "expected": "版本对比按钮变蓝，可以点击"
    },
    {
      "action": "勾选两个以上的版本",
      "expected": "版本对比按钮置灰，不可点击"
    },
    {
      "action": "勾选两个版本，点击版本比对",
      "expected": "1）将标准信息解析为json分为两部分，业务属性和技术属性，每项信息显示一行（技术属性中的枚举值，每个枚举项显示一行）\n2）更改的信息用颜色标记"
    }
  ]
} as const;

test.describe("验证数据标准-版本比对", () => {
  test("C0222 验证数据标准-版本比对", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
