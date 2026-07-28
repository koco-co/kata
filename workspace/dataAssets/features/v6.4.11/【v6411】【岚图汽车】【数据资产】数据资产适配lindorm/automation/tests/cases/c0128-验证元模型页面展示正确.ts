// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0128",
  "title": "验证【元模型页面】展示正确",
  "steps": [
    {
      "action": "进入【元数据】-【元模型管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "查看元模型首页",
      "expected": "1）展示各类元模型卡片\n2）icon及信息展示正确\n3） 展示【元模型名称】搜索弹窗"
    },
    {
      "action": "点击【元模型名称】搜索框",
      "expected": "展示所有数据源类型名称"
    },
    {
      "action": "选择${DATA_SOURCE_NAME},点击搜索",
      "expected": "返回数据源信息正确"
    },
    {
      "action": "鼠标hover ${DATASOURCE_TYPE}元模型卡片",
      "expected": "展示${DATASOURCE_TYPE}元模型的统计信息，信息包括：名称、技术属性项、通用业务属性项、子模型数量"
    }
  ]
} as const;

test.describe("验证【元模型页面】展示正确", () => {
  test("C0128 验证【元模型页面】展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
