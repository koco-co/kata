// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C293",
  "title": "验证「选择动态分区」-「分区值」全局参数下拉框展示正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，点击「请选择一级分区字段」下拉框",
      "expected": "展示表A所有字段id,name,dt,hour,ts"
    },
    {
      "action": "「一级分区字段」选择「dt」",
      "expected": "一级分区字段选择成功"
    },
    {
      "action": "点击「请选择一级分区值」",
      "expected": "展示全局参数中的参数名${参数名称（注释）}"
    },
    {
      "action": "选择参数",
      "expected": "「一级分区值」选择成功"
    },
    {
      "action": "点击「请选择二级分区」",
      "expected": "展示「hour」字段"
    },
    {
      "action": "「二级分区字段」选择「hour」",
      "expected": "二级分区字段选择成功"
    },
    {
      "action": "点击「请选择二级分区值」",
      "expected": "展示全局参数中的参数名${参数名称（注释）}"
    },
    {
      "action": "选择参数",
      "expected": "「二级分区值」选择成功"
    }
  ]
} as const;

test.describe("验证「选择动态分区」-「分区值」全局参数下拉框展示正确", () => {
  test("C293 验证「选择动态分区」-「分区值」全局参数下拉框展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
