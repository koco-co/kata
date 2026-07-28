// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0030",
  "title": "验证规则集详情页面显示正常(20规则包 * 10校验规则)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则集rule01, 点击表名",
      "expected": "右侧展开详情页, 包含基本信息和规则详情"
    },
    {
      "action": "检查【规则集详情页】中的基本信息",
      "expected": "数据显示正确, 规则包数量、规则数量分别为20、200"
    },
    {
      "action": "检查【规则集详情页】中的规则详情",
      "expected": "数据显示正确, 页面显示正常, 溢出数据通过列表下滑查看"
    },
    {
      "action": "进入【规则任务管理】中, 配置规则任务引入所有规则包、规则类型并保存",
      "expected": "保存成功"
    },
    {
      "action": "检查【规则任务详情页】",
      "expected": "显示规则任务关联的规则包中, 所有的校验规则"
    },
    {
      "action": "运行规则任务后, 进入【校验结果查询】, 检查【校验结果详情页】",
      "expected": "显示规则任务关联的规则包中, 所有的校验规则"
    }
  ]
} as const;

test.describe("验证规则集详情页面显示正常(20规则包 * 10校验规则)", () => {
  test("C0030 验证规则集详情页面显示正常(20规则包 * 10校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
