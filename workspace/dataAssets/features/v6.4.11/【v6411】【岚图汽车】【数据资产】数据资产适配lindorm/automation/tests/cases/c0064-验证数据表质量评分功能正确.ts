// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0064",
  "title": "验证数据表质量评分功能正确",
  "steps": [
    {
      "action": "表A的单表校验任务，当天已运行；\n查看表A的表详情页",
      "expected": "表详情页显示该表的质量评分"
    },
    {
      "action": "当前登陆用户，在表A单表校验任务所在质量项目中；\n表详情页，点击表A的“数据质量评分”；",
      "expected": "页面跳转至数据质量-数据质量报告-表A数据质量报告页"
    },
    {
      "action": "当前登陆用户，不在表A单表校验任务所在质量项目中；",
      "expected": "表详情页，表A的“数据质量评分”不可点击"
    },
    {
      "action": "表B的单表校验任务，当天未运行；\n查看表B的表详情页",
      "expected": "表详情页不显示该表的质量评分"
    },
    {
      "action": "不同项目同一张表有质量评分",
      "expected": "取置顶或最新创建"
    }
  ]
} as const;

test.describe("验证数据表质量评分功能正确", () => {
  test("C0064 验证数据表质量评分功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
