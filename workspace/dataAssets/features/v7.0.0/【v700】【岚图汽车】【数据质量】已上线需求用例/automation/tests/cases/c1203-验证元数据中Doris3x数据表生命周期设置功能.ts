// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1203",
  "title": "验证 「元数据」中 Doris 3.x 数据表生命周期设置功能",
  "steps": [
    {
      "action": "进入【数据资产】-【元数据】-【元数据管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择数据源类型为「Doris 3.x」的数据源, 点击进入",
      "expected": "进入成功"
    },
    {
      "action": "点击数据库, 进入数据表页面, 选择一条记录, 点击「批量编辑生命周期」按钮",
      "expected": "1) 弹出「批量编辑生命周期」弹窗2) 支持修改Doris 3.x数据表的生命周期3) 生命周期支持: 3天/7天/30天/90天/365天/自定义4) 选择「自定义」后最大输入9999天"
    },
    {
      "action": "「生命周期」选择3天, 点击「确定」",
      "expected": "弹窗关闭, 该表的「表生命周期」变更为3天"
    },
    {
      "action": "点击「元数据管理」, 返回到数据源列表页面",
      "expected": "返回成功"
    },
    {
      "action": "选择数据源类型为Doris 3.x的数据源, 点击「批量编辑生命周期」",
      "expected": "弹出「批量修改生命周期」弹窗"
    },
    {
      "action": "「生命周期」选择3天, 点击「确定」",
      "expected": "1) 弹窗关闭, 该数据源下所有的「表生命周期」变更为3天2) 后续在该数据源内新增的数据表也会默认配置为3天"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 数据表生命周期设置功能", () => {
  test("C1203 验证 「元数据」中 Doris 3.x 数据表生命周期设置功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
