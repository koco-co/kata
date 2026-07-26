// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C055",
  "title": "验证删除表功能正常",
  "steps": [
    {
      "action": "点击【删除表】按钮",
      "expected": "弹二次确认弹窗"
    },
    {
      "action": "删除表二次弹窗UI CHECK",
      "expected": "确认删除表${TABLE}吗？\n选择删除元数据表，删除后将影响子产品引用该表的所有任务，且资产平台中相关信息也会删除。\n删除方式 - 【删除元数据表】/【删除源表】\n表名输入框\n取消，删除按钮"
    },
    {
      "action": "选择【删除方式】为“删除元数据表”，输入表名${TABLE}, 点击删除按钮",
      "expected": "删除成功，资产平台不展示${TABLE}表，底层表不删除"
    },
    {
      "action": "选择【删除方式】为“删除源表”，输入表名${TABLE}, 点击删除按钮",
      "expected": "删除成功，资产平台不展示${TABLE}表，底层表也删除"
    }
  ]
} as const;

test.describe("验证删除表功能正常", () => {
  test("C055 验证删除表功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
