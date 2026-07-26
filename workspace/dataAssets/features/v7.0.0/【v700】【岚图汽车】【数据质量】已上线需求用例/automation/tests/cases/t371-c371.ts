// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C371",
  "title": "验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】数据预览按照分区进行显示（新建监控规则-监控规则-完整性验证）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称]输入「test_rule」[选择数据源]选择「${DATASOURCE}」[选择数据库]选择「${DATABASE}」[选择数据表]选择「${TABLE}」[选择分区] 手动输入分区 - \"id=1\"",
      "expected": "[监控对象]配置完成"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "进入[监控规则]配置页面"
    },
    {
      "action": "点击【添加规则】按钮-选择[完整性验证]",
      "expected": "页面新增[完整性验证]/[唯一性验证]配置栏"
    },
    {
      "action": "完整性验证配置如下：[规则类型] 多表数据行数对比[选择对比表]- [对比表所属库] DataQuery_Doris [对比表] user_profile_4023 [输入分区] 手动输入分区 - \"id=1\"[强弱规则] 弱规则[规则描述] 不作填写",
      "expected": "[完整性验证]配置完毕"
    },
    {
      "action": "点击【完整性校验】-【选择对比表】-【输入分区】-【数据预览】按钮",
      "expected": "弹出【数据预览】列表，按照选择的分区值进行过滤后展示数据预览内容，支持横向滚动条滚动配置"
    }
  ]
} as const;

test.describe("验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】数据预览按照分区进行显示（新建监控规则-监控规则-完整性验证）", () => {
  test("C371 验证【支持按照选择的分区信息进行数据预览（监控对象/监控规则）】数据预览按照分区进行显示（新建监控规则-监控规则-完整性验证）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
