// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C428",
  "title": "验证数据脱敏-脱敏白名单-新增交互与数据展示正确",
  "steps": [
    {
      "action": "位置：「数据安全」-「数据脱敏管理」-「脱敏白名单」\n点击【新增】；",
      "expected": "显示“新增”弹窗，表单元素包含“数据源类型”、“数据源”、“数据库”、“数据表”；且均为必选；"
    },
    {
      "action": "查看“数据源类型”下拉选项",
      "expected": "下拉选项为：当前数据地图所有数据源类型；\n下拉项为单选项"
    },
    {
      "action": "选择数据源类型，查看“数据源”下拉选项",
      "expected": "下拉选项为：所选数据源类型下的所有数据源；\n下拉项为单选项"
    },
    {
      "action": "选择数据源，查看“数据库”下拉选项",
      "expected": "下拉选项为：所选数据源下已同步至数据地图的所有数据库+“全部”选项；\n下拉项为单选项"
    },
    {
      "action": "选择“数据库”，查看“数据表”下拉选项",
      "expected": "下拉选项为：所选数据库下已同步至数据地图的所有数据表+“全部”选项；\n下拉项为多选项"
    },
    {
      "action": "“数据库“选项选择”全部“",
      "expected": "“数据库”其他选项无法选中；\n“数据表”自动选中“全部”，且无法修改"
    },
    {
      "action": "“数据表“选项选择”全部“",
      "expected": "其他选项无法选中"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-新增交互与数据展示正确", () => {
  test("C428 验证数据脱敏-脱敏白名单-新增交互与数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
