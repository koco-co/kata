// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C094",
  "title": "验证「规则任务管理」中 Doris 3.x 数据源规则任务的查询功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "输入表名${name}, 进行查询",
      "expected": "查询出「表」的表名中所有包含${name}的规则记录"
    },
    {
      "action": "置空所有查询条件, 输入不存在表名${name2}, 进行查询",
      "expected": "显示「暂无数据」"
    },
    {
      "action": "置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询",
      "expected": "查询出表名包含${name3}且最近修改人为${person3}的规则记录"
    },
    {
      "action": "置空所有查询条件, 勾选「我收藏的表」",
      "expected": "查询出操作中仅为「取消收藏」的表"
    },
    {
      "action": "置空所有查询条件, 切换分页组件为「10条/页」",
      "expected": "当前页面规则数量变更为10条"
    },
    {
      "action": "点击页码",
      "expected": "跳转至对应的页码页面"
    },
    {
      "action": "点击\"<\"",
      "expected": "向前翻页"
    },
    {
      "action": "点击\">\"",
      "expected": "向后翻页"
    },
    {
      "action": "切换每页展示数量",
      "expected": "每页展示记录数为切换后的数量"
    }
  ]
} as const;

test.describe("验证「规则任务管理」中 Doris 3.x 数据源规则任务的查询功能正常", () => {
  test("C094 验证「规则任务管理」中 Doris 3.x 数据源规则任务的查询功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
