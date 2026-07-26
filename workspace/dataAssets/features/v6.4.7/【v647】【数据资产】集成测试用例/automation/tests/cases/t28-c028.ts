// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C028",
  "title": "验证「规范设计」-新增数仓层级功能正常",
  "steps": [
    {
      "action": "进入「资产」-「数据模型」-「规范建表」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「规范设计」按钮",
      "expected": "进入「规范设计」页面成功"
    },
    {
      "action": "点击「新增数据层级」按钮",
      "expected": "弹「新增数据层级」弹窗"
    },
    {
      "action": "「中文名称」输入「新增层级」\n「英文名称」输入「add_catalog」\n「描述」输入「test _ desc」",
      "expected": "配置完成"
    },
    {
      "action": "点击「确定」按钮",
      "expected": "新增数仓层级成功"
    },
    {
      "action": "选择「新增层级」，点击「规范设计」按钮",
      "expected": "弹「规范设计」弹窗"
    },
    {
      "action": "「模型元素」配置「业务系统」「主题域」，点击「确定」按钮",
      "expected": "配置成功"
    },
    {
      "action": "进入「建表」页面，「数仓层级」选择「新增层级」",
      "expected": "展示「新增层级」下的「规范设计内容」"
    },
    {
      "action": "新增表流程结束",
      "expected": "新增表成功"
    },
    {
      "action": "查看表所属数仓层级",
      "expected": "该表存储在「新增层级」下"
    }
  ]
} as const;

test.describe("验证「规范设计」-新增数仓层级功能正常", () => {
  test("C028 验证「规范设计」-新增数仓层级功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
