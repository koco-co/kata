// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0301",
  "title": "验证「选择动态分区」后页面交互正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」",
      "expected": "展示「输入分区」右侧展示「全局参数」按钮必填项「请选择一级分区字段」「请选择一级分区值」下拉单选框非必填项「请选择二级分区字段」「请选择二级分区值」下拉单选框"
    }
  ]
} as const;

test.describe("验证「选择动态分区」后页面交互正确", () => {
  test("C0301 验证「选择动态分区」后页面交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
