// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C370",
  "title": "验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】数据预览按照分区进行显示（编辑监控规则-监控对象处）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】规则，点击【编辑】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称]输入「test_rule」[选择数据源]选择「${DATASOURCE}」[选择数据库]选择「${DATABASE}」[选择数据表]选择「${TABLE}」[选择分区] 手动输入分区 - \"id=1\"",
      "expected": "[监控对象]配置完成"
    },
    {
      "action": "点击【数据预览】按钮",
      "expected": "弹出【数据预览】列表，按照选择的分区值进行过滤后展示数据预览内容，支持横向滚动条滚动配置"
    }
  ]
} as const;

test.describe("验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】数据预览按照分区进行显示（编辑监控规则-监控对象处）", () => {
  test("C370 验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】数据预览按照分区进行显示（编辑监控规则-监控对象处）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
