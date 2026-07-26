// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C294",
  "title": "验证「选择动态分区」-表字段-搜索功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，点击「请选择一级分区字段」下拉框",
      "expected": "展示表A所有字段id,name,age,dt,ts,pt"
    },
    {
      "action": "输入不存在的字段名\"test\"",
      "expected": "匹配失败，展示空白缺省页"
    },
    {
      "action": "输入特殊字符\"！@#¥%……&\"",
      "expected": "匹配失败，展示空白缺省页"
    },
    {
      "action": "输入\"a\"",
      "expected": "模糊匹配出字段「name，age」"
    },
    {
      "action": "输入\"age\"",
      "expected": "仅展示\"age\"字段"
    },
    {
      "action": "选择「一级分区字段」为「dt」,选择分区值",
      "expected": "一级分区选择成功"
    },
    {
      "action": "点击「请选择二级分区字段」",
      "expected": "展示「pt」字段"
    },
    {
      "action": "输入不存在的字段名\"test\"",
      "expected": "匹配失败，展示空白缺省页"
    },
    {
      "action": "输入特殊字符\"！@#¥%……&\"",
      "expected": "匹配失败，展示空白缺省页"
    },
    {
      "action": "输入\"p\"",
      "expected": "模糊匹配出字段「pt」"
    },
    {
      "action": "输入\"pt\"",
      "expected": "仅展示\"pt\"字段"
    }
  ]
} as const;

test.describe("验证「选择动态分区」-表字段-搜索功能正确", () => {
  test("C294 验证「选择动态分区」-表字段-搜索功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
