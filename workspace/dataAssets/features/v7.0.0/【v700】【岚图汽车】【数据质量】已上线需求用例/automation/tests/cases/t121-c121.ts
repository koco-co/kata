// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C121",
  "title": "验证「完整性校验」-校验类型新增「多表数据行数对比」",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "校验类型 选择 「多表数据行数对比」",
      "expected": "多表数据内容对表单配置项包含:1) 校验类型/选择对比表1所属库/选择对比表1/输入分区/规则描述2) 选择对比表1所属库/选择对比表1: 仅支持单选, 但可以添加多个库表, 最多添加至10个3) 按钮: 保存 / 取消 / 对比细节设置"
    }
  ]
} as const;

test.describe("验证「完整性校验」-校验类型新增「多表数据行数对比」", () => {
  test("C121 验证「完整性校验」-校验类型新增「多表数据行数对比」", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
