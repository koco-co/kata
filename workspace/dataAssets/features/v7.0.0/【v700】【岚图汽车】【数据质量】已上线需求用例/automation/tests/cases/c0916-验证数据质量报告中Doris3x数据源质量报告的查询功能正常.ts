// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0916",
  "title": "验证「数据质量报告」中 Doris 3.x 数据源质量报告的查询功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "输入报告名称 ${name}, 进行查询",
      "expected": "查询出报告名称中所有包含${name}的记录"
    },
    {
      "action": "置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询",
      "expected": "查询出表名包含${name3}且最近修改人为${person3}的规则记录"
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

test.describe("验证「数据质量报告」中 Doris 3.x 数据源质量报告的查询功能正常", () => {
  test("C0916 验证「数据质量报告」中 Doris 3.x 数据源质量报告的查询功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
