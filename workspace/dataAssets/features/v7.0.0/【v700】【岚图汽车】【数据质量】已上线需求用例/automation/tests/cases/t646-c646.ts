// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C646",
  "title": "验证「有效性校验」校验不通过的规则查看明细功能",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】」页面",
      "expected": "页面正常打开，显示表“test_info_1”的规则"
    },
    {
      "action": "查看规则sql",
      "expected": "子规则为有效性：数值-取值范围、数值-枚举个数、枚举值、取值范围&枚举范围的脏数据存储表为同一个"
    },
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【校验结果查询】」页面",
      "expected": "页面正常打开，显示表“test_info_1”的规则"
    },
    {
      "action": "选中该表名，查看任务结果详情",
      "expected": "显示校验未通过的子规则详情，展示【查看明细】按钮"
    },
    {
      "action": "点击【查看明细】按钮",
      "expected": "1）展示该表中不符合规则的数据 2）显示行数<=100 3）显示【下载明细】按钮"
    },
    {
      "action": "点击【下载明细】按钮",
      "expected": "可下载到本地，内容正确，行数<=100"
    },
    {
      "action": "进入「资产-数据质量-数据质量报告」页面",
      "expected": "页面正常打开，显示表“test_info_1”的报告"
    },
    {
      "action": "进入该报告的详情页，查看报告详情",
      "expected": "规则校验明细表中显示“操作-查看详情”"
    },
    {
      "action": "点击【查看详情】按钮",
      "expected": "展开该表中不符合规则的数据，行数<=100，显示【下载明细】按钮"
    },
    {
      "action": "点击【下载明细】按钮",
      "expected": "可下载到本地，内容正确，行数<=100"
    }
  ]
} as const;

test.describe("验证「有效性校验」校验不通过的规则查看明细功能", () => {
  test("C646 验证「有效性校验」校验不通过的规则查看明细功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
